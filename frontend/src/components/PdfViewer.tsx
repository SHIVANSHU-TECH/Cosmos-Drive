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
  const [isRendering, setIsRendering] = useState(false);
  const [pendingPageNumber, setPendingPageNumber] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { token } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  
  // Initialize dark mode
  useEffect(() => {
    // Check for dark mode preference in localStorage or system preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);
  
  // Debug the received URL and auth state
  useEffect(() => {
    console.log('PdfViewer received props:', { fileUrl, fileName });
    console.log('PdfViewer auth state:', { token });
  }, [fileUrl, fileName, token]);

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
  }, [fileUrl]);

  // Re-render page when pageNumber changes without reloading the document
  useEffect(() => {
    if (pdfRef.current) {
      renderPage(pageNumber);
    }
  }, [pageNumber]);

  // Re-render when zoom scale changes (desktop only)
  useEffect(() => {
    if (pdfRef.current) {
      renderPage(pageNumber);
    }
  }, [scale]);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading PDF from URL:', fileUrl);
      
      // Build absolute URL for pdf.js so it can use HTTP range requests
      const backendUrl = getBackendUrl();
      const absoluteUrl = fileUrl.startsWith('/api/') ? `${backendUrl}${fileUrl}` : fileUrl;

      // Prepare optional auth header for private route
      const httpHeaders: Record<string, string> = {};
      if (fileUrl.startsWith('/api/private/drive/pdf/')) {
        if (!token) {
          throw new Error('Authentication required to view this PDF. Please log in to access this feature.');
        }
        httpHeaders['Authorization'] = `Bearer ${token}`;
      }

      // Let pdf.js fetch with URL so it can do byte-range streaming
      const loadingTask = pdfjsLib.getDocument({
        url: absoluteUrl,
        httpHeaders
      });

      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        // Optional: could gate with NODE_ENV/quiet if needed
        // console.log('PDF loading progress:', progress);
      };

      const pdf = await loadingTask.promise;
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      
      const initialScale = isMobile ? 0.8 : 1.0;
      setScale(initialScale);
      
      renderPage(pageNumber);
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
      setIsRendering(true);
      
      // Cancel any ongoing render operations
      if (pdfRef.current.renderTask) {
        pdfRef.current.renderTask.cancel();
      }
      
      const page = await pdfRef.current.getPage(pageNum);
      
      // Calculate scale based on container width and height (fit-to-box)
      const canvas = canvasRef.current;
      const parent = canvas.parentElement; // inner wrapper that controls width/height
      const containerWidth = parent?.clientWidth || window.innerWidth;
      const containerHeight = parent?.clientHeight || window.innerHeight * 0.85;
      const viewport = page.getViewport({ scale: 1 });
      const widthScale = (containerWidth * 0.98) / viewport.width;
      const heightScale = (containerHeight * 0.98) / viewport.height;
      const fitScale = Math.min(widthScale, heightScale);
      const userScale = scale;
      const finalScale = fitScale * userScale;
      console.log('Container WxH:', containerWidth, 'x', containerHeight, 'Viewport WxH:', viewport.width, 'x', viewport.height, 'Scale W/H:', widthScale, heightScale, 'Final:', finalScale);
      
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
      setIsRendering(false);
      // If there is a pending page request, render that next (only latest wins)
      if (pendingPageNumber !== null && pendingPageNumber !== pageNum) {
        const nextPage = Math.min(Math.max(pendingPageNumber, 1), numPages);
        setPendingPageNumber(null);
        setPageNumber(nextPage);
        // renderPage will be triggered by the pageNumber effect
      }
    } catch (err) {
      // Ignore cancellation errors as they're expected when switching pages quickly
      if (err instanceof Error && err.name === 'RenderingCancelledException') {
        console.log('Rendering cancelled for page', pageNum);
        setIsRendering(false);
        return;
      }
      
      const errorMessage = 'Failed to render page: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMessage);
      console.error('Page rendering error:', err);
      setIsRendering(false);
    }
  };

  const goToPrevPage = () => {
    if (pageNumber <= 1) return;
    if (isRendering) {
      setPendingPageNumber(pageNumber - 1);
    } else {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber >= numPages) return;
    if (isRendering) {
      setPendingPageNumber(pageNumber + 1);
    } else {
      setPageNumber(pageNumber + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.2));
  };

  const lastTapRef = useRef<number | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  const distance = (t1: any, t2: any) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    if (e.touches.length === 2) {
      pinchStartDistanceRef.current = distance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
      startXRef.current = e.touches[0].clientX;
      isSwipingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      const newDist = distance(e.touches[0], e.touches[1]);
      const ratio = newDist / pinchStartDistanceRef.current;
      setScale(prev => Math.min(Math.max(prev * ratio, 0.5), 3));
      pinchStartDistanceRef.current = newDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return;
    if (e.changedTouches.length === 1 && isSwipingRef.current && startXRef.current !== null) {
      const endX = e.changedTouches[0].clientX;
      const dx = endX - startXRef.current;
      const threshold = 50;
      if (dx > threshold) {
        goToPrevPage();
      } else if (dx < -threshold) {
        goToNextPage();
      }
    }
    isSwipingRef.current = false;
    startXRef.current = null;
  };

  const handleDoubleTap = () => {
    if (!isMobile) return;
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < 300) {
      setScale(prev => (prev < 1.2 ? 1.5 : 1.0));
      lastTapRef.current = null;
    } else {
      lastTapRef.current = now;
    }
  };

  // Don't render anything during SSR
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4 ${darkMode ? 'bg-black bg-opacity-90' : 'bg-black bg-opacity-90'}`}>
      <div className={`rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-lg sm:text-xl font-bold truncate max-w-md sm:max-w-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{fileName}</h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PDF Document</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              darkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Toolbar - navigation and desktop zoom controls */}
        <div className={`flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 gap-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className={`px-3 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors flex items-center ${
                darkMode 
                  ? 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Previous
            </button>
            <span className={`px-3 py-2 text-sm rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border border-gray-600 text-white' 
                : 'bg-white border border-gray-300 text-gray-700'
            }`}>
              Page {pageNumber} of {numPages}
            </span>
            <button 
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className={`px-3 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors flex items-center ${
                darkMode 
                  ? 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Zoom:</span>
              <button
                onClick={zoomOut}
                className={`px-3 py-2 text-sm rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                aria-label="Zoom out"
              >
                −
              </button>
              <span className={`px-3 py-2 text-sm rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className={`px-3 py-2 text-sm rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => setScale(1.0)}
                className={`px-3 py-2 text-sm rounded-lg ${scale === 1.0 ? 'bg-blue-600 text-white' : (darkMode ? 'bg-gray-700 border border-gray-600 text-white hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50')}`}
              >
                Reset
              </button>
            </div>
          )}
        </div>
        
        {/* PDF Content */}
        <div className={`flex-1 overflow-auto p-2 sm:p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
             onClick={handleDoubleTap}
        >
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto"></div>
                <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading PDF...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className={`p-4 sm:p-6 rounded-lg border ${
              darkMode 
                ? 'text-red-300 bg-red-900 border-red-700' 
                : 'text-red-600 bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="font-medium">Error:</span>
                <span className="ml-2">{error}</span>
              </div>
              {error.includes('Authentication required') && (
                <div className="mt-4">
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    To view PDF files directly in the browser, you need to be logged in.
                  </p>
                  <a 
                    href="/auth/login" 
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      darkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Log In
                  </a>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center">
            <div className="w-full md:w-11/12 lg:w-4/5 xl:w-3/5 2xl:w-1/2 max-w-[1100px] h-[85vh] flex items-start justify-center mx-auto overflow-auto touch-none">
              <canvas ref={canvasRef} className="shadow-lg bg-white rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}