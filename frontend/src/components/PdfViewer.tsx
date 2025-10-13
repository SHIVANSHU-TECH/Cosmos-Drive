'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getBackendUrl } from '@/utils/api'; // Import the API utility function

// Dynamically import PDF.js to avoid SSR issues
let pdfjsLib: any;

if (typeof window !== 'undefined') {
  pdfjsLib = require('pdfjs-dist');
  // Set the worker path for PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export default function PdfViewer({ fileUrl, fileName, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    // Check if device is mobile
    const mobileCheck = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      setIsMobile(/android|ipad|iphone|ipod/i.test(userAgent));
    };
    
    if (typeof window !== 'undefined') {
      mobileCheck();
      loadPdf();
    }
    
    // Add event listener for Escape key
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    
    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current && pdfRef.current) {
        renderPage(pageNumber);
      }
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleResize);
      
      // Cancel any ongoing render operations
      if (pdfRef.current && pdfRef.current.renderTask) {
        pdfRef.current.renderTask.cancel();
      }
      
      // Clean up PDF object
      if (pdfRef.current) {
        pdfRef.current.destroy();
      }
    };
  }, [fileUrl, pageNumber]);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading PDF from URL:', fileUrl);
      
      // For PDF proxy URLs, we need to extract the file ID and use our API utility
      if (fileUrl.startsWith('/api/private/drive/pdf/')) {
        const fileId = fileUrl.split('/').pop();
        if (!fileId) {
          throw new Error('Invalid PDF URL');
        }
        
        // Check if we have a valid token
        if (!token) {
          throw new Error('Authentication required to view this PDF. Please log in to access this feature.');
        }
        
        // Fetch PDF using our API utility function
        const backendUrl = getBackendUrl();
        const url = `${backendUrl}/api/private/drive/pdf/${fileId}`;
        
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('Access denied. Please log in to view this PDF.');
          }
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        // Load PDF with the response
        const loadingTask = pdfjsLib.getDocument({
          data: await response.arrayBuffer()
        });
        
        // Add progress tracking
        loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
          console.log('PDF loading progress:', progress);
        };
        
        const pdf = await loadingTask.promise;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        console.log('PDF loaded with', pdf.numPages, 'pages');
        
        // Set initial scale based on device
        const initialScale = isMobile ? 0.8 : 1.0;
        setScale(initialScale);
        
        renderPage(pageNumber);
      } else {
        // For direct URLs, use the existing method
        // Prepare HTTP headers with authentication token
        const httpHeaders: Record<string, string> = {};
        if (token) {
          httpHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        // Load PDF with authentication headers
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          httpHeaders
        });
        
        // Add progress tracking
        loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
          console.log('PDF loading progress:', progress);
        };
        
        const pdf = await loadingTask.promise;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        console.log('PDF loaded with', pdf.numPages, 'pages');
        
        // Set initial scale based on device
        const initialScale = isMobile ? 0.8 : 1.0;
        setScale(initialScale);
        
        renderPage(pageNumber);
      }
    } catch (err) {
      const errorMessage = 'Failed to load PDF: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMessage);
      console.error('PDF loading error:', err);
      
      // Additional error details for debugging
      if (err && typeof err === 'object' && 'status' in err) {
        console.error('Error status:', (err as any).status);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfRef.current || !canvasRef.current) return;
    
    try {
      console.log('Rendering page', pageNum);
      
      // Cancel any ongoing render operations
      if (pdfRef.current.renderTask) {
        pdfRef.current.renderTask.cancel();
      }
      
      const page = await pdfRef.current.getPage(pageNum);
      
      // Calculate scale based on container width
      const canvas = canvasRef.current;
      const containerWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      const viewport = page.getViewport({ scale: 1 });
      const scaleRatio = (containerWidth * 0.9) / viewport.width;
      const finalScale = Math.min(scale, scaleRatio);
      console.log('Container width:', containerWidth, 'Viewport width:', viewport.width, 'Scale ratio:', scaleRatio, 'Final scale:', finalScale);
      
      const scaledViewport = page.getViewport({ scale: finalScale });
      
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Set canvas dimensions
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };
      
      // Store the render task so it can be cancelled if needed
      const renderTask = page.render(renderContext);
      pdfRef.current.renderTask = renderTask;
      
      await renderTask.promise;
      console.log('Page rendered successfully');
    } catch (err) {
      // Ignore cancellation errors as they're expected when switching pages quickly
      if (err instanceof Error && err.name === 'RenderingCancelledException') {
        console.log('Rendering cancelled for page', pageNum);
        return;
      }
      
      const errorMessage = 'Failed to render page: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMessage);
      console.error('Page rendering error:', err);
    }
  };

  const goToPrevPage = () => {
    if (pageNumber <= 1) return;
    setPageNumber(pageNumber - 1);
  };

  const goToNextPage = () => {
    if (pageNumber >= numPages) return;
    setPageNumber(pageNumber + 1);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.2));
  };

  // Don't render anything during SSR
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate max-w-md sm:max-w-lg">{fileName}</h2>
            <p className="text-sm text-gray-500 mt-1">PDF Document</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Toolbar - responsive layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-gray-50 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Previous
            </button>
            <span className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
              Page {pageNumber} of {numPages}
            </span>
            <button 
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors flex items-center"
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={zoomOut}
              disabled={scale <= 0.2}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
              </svg>
            </button>
            <span className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={zoomIn}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {/* PDF Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 bg-gray-100">
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-4 sm:p-6 text-red-600 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="font-medium">Error:</span>
                <span className="ml-2">{error}</span>
              </div>
              {error.includes('Authentication required') && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    To view PDF files directly in the browser, you need to be logged in.
                  </p>
                  <a 
                    href="/auth/login" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Log In
                  </a>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="shadow-lg max-w-full bg-white rounded-lg" />
          </div>
        </div>
        
        {/* Mobile navigation buttons */}
        {isMobile && (
          <div className="flex justify-between p-4 bg-gray-50 border-t border-gray-200">
            <button 
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Prev
            </button>
            <button 
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors flex items-center"
            >
              Next
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}