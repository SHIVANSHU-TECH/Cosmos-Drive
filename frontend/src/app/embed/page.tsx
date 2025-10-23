'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { fetchEmbedFiles } from '@/utils/api';
import PdfViewer from '@/components/PdfViewer';
import { useAuth } from '@/components/AuthProvider';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
}

function EmbedPageContent() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [darkMode, setDarkMode] = useState(false);
  const searchParams = useSearchParams();
  const { token, isAuthenticated } = useAuth();

  // Initialize with URL parameters
  useEffect(() => {
    const apiKey = searchParams.get('key');
    const folderId = searchParams.get('folderid');
    const allowdl = searchParams.get('allowdl');
    
    if (apiKey && folderId) {
      setAllowDownload(allowdl !== 'no');
      setCurrentFolderId(folderId);
      setFolderPath([{id: folderId, name: 'Root'}]); // Initialize with root folder
    }
    
    // Check for dark mode preference in localStorage or system preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, [searchParams]);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    // Save preference to localStorage
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Fetch files when currentFolderId changes
  useEffect(() => {
    if (currentFolderId) {
      fetchFiles();
    }
  }, [currentFolderId, searchTerm]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get API key from URL parameters
      const apiKey = searchParams.get('key');
      
      if (!apiKey) {
        throw new Error('API key is required');
      }
      
      // Fetch files from our API using the correct endpoint
      const data = await fetchEmbedFiles(currentFolderId, apiKey);
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  function openPdfPreview(file: DriveFile) {
    // Always use the public PDF proxy for embed pages, regardless of authentication state
    // This ensures public files can be previewed without requiring login
    const pdfProxyUrl = `/api/public/drive/pdf/${file.id}`;
    setPdfPreview({
      url: pdfProxyUrl,
      name: file.name
    });
  }

  function closePdfPreview() {
    setPdfPreview(null);
  }

  function navigateToFolder(folderId: string, folderName: string) {
    // Update current folder ID to trigger file fetch
    setCurrentFolderId(folderId);
    
    // Update folder path for breadcrumb navigation
    const newPath = [...folderPath];
    newPath.push({id: folderId, name: folderName});
    setFolderPath(newPath);
  }

  function navigateToParentFolder(index: number) {
    // Navigate back to a parent folder by index
    if (index >= 0 && index < folderPath.length) {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    
    const term = searchTerm.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(term)
    );
  }, [files, searchTerm]);

  // Show loading state
  if (loading && files.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading files...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && files.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
        <div className={`max-w-md w-full rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-center">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`mt-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Error</h3>
            <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchFiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
      {/* PDF Viewer Modal */}
      {pdfPreview && (
        <PdfViewer 
          fileUrl={pdfPreview.url} 
          fileName={pdfPreview.name} 
          onClose={closePdfPreview} 
        />
      )}
      
      <div className="max-w-6xl mx-auto">
        <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Breadcrumb Navigation */}
          {folderPath.length > 1 && (
            <div className={`p-3 ${darkMode ? 'bg-gray-700 border-b border-gray-600' : 'bg-gray-100 border-b border-gray-200'}`}>
              <nav className="flex overflow-x-auto" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-2">
                  {folderPath.map((folder, index) => (
                    <li key={folder.id} className="inline-flex items-center">
                      {index > 0 && (
                        <svg className="w-4 h-4 mx-1 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                        </svg>
                      )}
                      <button
                        onClick={() => navigateToParentFolder(index)}
                        className={`inline-flex items-center text-sm font-medium ${
                          index === folderPath.length - 1 
                            ? darkMode ? 'text-gray-400 cursor-default' : 'text-gray-500 cursor-default'
                            : darkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'
                        }`}
                        disabled={index === folderPath.length - 1}
                      >
                        {folder.name}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          )}
          
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Cosmos Drive</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>Files in this folder</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Search and View Controls */}
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
            <div className="w-full md:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search files..."
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 sm:text-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md font-medium flex items-center ${
                  viewMode === 'grid' 
                    ? darkMode 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-blue-600 text-white shadow-md'
                    : darkMode 
                      ? 'bg-gray-600 text-gray-200 border border-gray-500 hover:bg-gray-500' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
                Grid View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md font-medium flex items-center ${
                  viewMode === 'table' 
                    ? darkMode 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-blue-600 text-white shadow-md'
                    : darkMode 
                      ? 'bg-gray-600 text-gray-200 border border-gray-500 hover:bg-gray-500' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Table View
              </button>
            </div>
          </div>
          
          {/* Loading indicator for navigation */}
          {loading && files.length > 0 && (
            <div className={`p-4 ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'} text-center`}>
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-2"></div>
                <span>Loading folder contents...</span>
              </div>
            </div>
          )}
          
          {/* Error indicator for navigation */}
          {error && files.length > 0 && (
            <div className={`p-4 ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-700'}`}>
              <div className="flex items-center justify-between">
                <span>Error: {error}</span>
                <button
                  onClick={fetchFiles}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    darkMode 
                      ? 'bg-red-700 text-white hover:bg-red-600' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
              </svg>
              <h3 className={`mt-2 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No files found</h3>
              <p className={`mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {searchTerm ? 'No files match your search.' : 'This folder appears to be empty.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <GridView 
              files={filteredFiles} 
              navigateToFolder={navigateToFolder} 
              openPdfPreview={openPdfPreview} 
              allowDownload={allowDownload} 
              darkMode={darkMode}
            />
          ) : (
            <TableView 
              files={filteredFiles} 
              navigateToFolder={navigateToFolder} 
              openPdfPreview={openPdfPreview} 
              allowDownload={allowDownload} 
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GridView({ 
  files, 
  navigateToFolder, 
  openPdfPreview, 
  allowDownload,
  darkMode
}: { 
  files: DriveFile[]; 
  navigateToFolder: (folderId: string, folderName: string) => void;
  openPdfPreview: (file: DriveFile) => void;
  allowDownload: boolean;
  darkMode: boolean;
}) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('image')) {
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    }
  };
  
  // Function to handle download through backend proxy to hide Google Drive links
  const handleDownload = async (file: DriveFile) => {
    try {
      // Use our backend proxy to download the file without exposing Google Drive links
      const response = await fetch(`/api/public/drive/file/${file.id}`);
      if (response.ok) {
        // Create a temporary link to trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback to direct download if proxy fails
        const link = document.createElement('a');
        link.href = file.webContentLink || file.webViewLink || '';
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to direct download if proxy fails
      const link = document.createElement('a');
      link.href = file.webContentLink || file.webViewLink || '';
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {files.map((file) => (
        <div 
          key={file.id} 
          className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center mb-3">
            {getFileIcon(file.mimeType)}
            <h3 className={`font-medium ml-2 truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{file.name}</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {file.mimeType === 'application/vnd.google-apps.folder' ? (
              <button
                onClick={() => navigateToFolder(file.id, file.name)}
                className="flex-1 min-w-[80px] text-center px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Open
              </button>
            ) : allowDownload ? (
              <button
                onClick={() => handleDownload(file)}
                className="flex-1 min-w-[80px] text-center px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Download
              </button>
            ) : null}
            
            {file.mimeType === 'application/pdf' ? (
              <button
                onClick={() => openPdfPreview(file)}
                className="flex-1 min-w-[80px] text-center px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                View
              </button>
            ) : null}
          </div>
          
          {file.size && (
            <p className={`mt-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              Size: {formatFileSize(file.size)}
            </p>
          )}
          
          {file.modifiedTime && (
            <p className={`mt-1 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              Modified: {new Date(file.modifiedTime).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TableView({ 
  files, 
  navigateToFolder, 
  openPdfPreview, 
  allowDownload,
  darkMode
}: { 
  files: DriveFile[]; 
  navigateToFolder: (folderId: string, folderName: string) => void;
  openPdfPreview: (file: DriveFile) => void;
  allowDownload: boolean;
  darkMode: boolean;
}) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('image')) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    }
  };
  
  // Function to handle download through backend proxy to hide Google Drive links
  const handleDownload = async (file: DriveFile) => {
    try {
      // Use our backend proxy to download the file without exposing Google Drive links
      const response = await fetch(`/api/public/drive/file/${file.id}`);
      if (response.ok) {
        // Create a temporary link to trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback to direct download if proxy fails
        const link = document.createElement('a');
        link.href = file.webContentLink || file.webViewLink || '';
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to direct download if proxy fails
      const link = document.createElement('a');
      link.href = file.webContentLink || file.webViewLink || '';
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <div className={`overflow-x-auto rounded-lg ${darkMode ? 'shadow-none' : 'shadow'}`}>
      <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
          <tr>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Type</th>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Size</th>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Modified</th>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
          {files.map((file) => (
            <tr key={file.id} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
              <td className={`py-3 px-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-5 w-5 text-gray-500">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="ml-3">
                    {file.mimeType === 'application/vnd.google-apps.folder' ? (
                      <button 
                        onClick={() => navigateToFolder(file.id, file.name)}
                        className={`hover:underline font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                      >
                        {file.name}
                      </button>
                    ) : (
                      <span className="font-medium">{file.name}</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                } capitalize`}>
                  {file.mimeType.split('/')[1] || file.mimeType.split('/')[0]}
                </span>
              </td>
              <td className={`py-3 px-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {file.size ? formatFileSize(file.size) : 'N/A'}
              </td>
              <td className={`py-3 px-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-sm font-medium">
                <div className="flex flex-wrap gap-2">
                  {file.mimeType === 'application/vnd.google-apps.folder' ? (
                    <button
                      onClick={() => navigateToFolder(file.id, file.name)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Open
                    </button>
                  ) : allowDownload ? (
                    <button
                      onClick={() => handleDownload(file)}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Download
                    </button>
                  ) : null}
                  
                  {file.mimeType === 'application/pdf' ? (
                    <button
                      onClick={() => openPdfPreview(file)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      View
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Loading fallback component
function EmbedPageLoading() {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // Check for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading files...</p>
      </div>
    </div>
  );
}

// Error fallback component
function EmbedPageError({ error }: { error: string }) {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // Check for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
      <div className={`max-w-md w-full rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`mt-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Error</h3>
          <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function EmbedPage() {
  return (
    <Suspense fallback={<EmbedPageLoading />}>
      <EmbedPageContent />
    </Suspense>
  );
}

function formatFileSize(bytes: string): string {
  const size = parseInt(bytes);
  if (size === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
