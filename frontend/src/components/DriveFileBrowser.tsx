'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PdfViewer from '@/components/PdfViewer';
import { fetchFiles, fetchFolderPath, getBackendUrl } from '@/utils/api'; // Import getBackendUrl

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  parents?: string[];
}

interface FolderPath {
  id: string;
  name: string;
}

export default function DriveFileBrowser({ initialFolderId }: { initialFolderId: string }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DriveFile; direction: 'asc' | 'desc' } | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [folderPath, setFolderPath] = useState<FolderPath[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  const { token, logout } = useAuth();

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

  // Reset state when folder ID changes
  useEffect(() => {
    // Extract folder ID from URL if full URL is provided
    let id = initialFolderId;
    if (initialFolderId.includes('drive.google.com/drive/folders/')) {
      const match = initialFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        id = match[1];
      }
    }
    
    // Also remove any query parameters
    if (id.includes('?')) {
      id = id.split('?')[0];
    }
    
    setCurrentFolderId(id);
    setFiles([]);
    setFolderPath([]);
    setError(null);
  }, [initialFolderId]);

  useEffect(() => {
    if (currentFolderId) {
      console.log('Fetching files for folder ID:', currentFolderId);
      console.log('Using token:', token ? 'Token present' : 'No token');
      fetchFilesAndPath();
    }
  }, [currentFolderId, searchTerm, token]);

  const fetchFilesAndPath = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine which endpoint to use based on authentication status
      const endpoint = token ? 'private' : 'public';
      
      // Fetch files with search term
      const filesData = await fetchFiles(endpoint, currentFolderId, token || undefined, searchTerm);
      
      // Fetch folder path
      const pathData = await fetchFolderPath(endpoint, currentFolderId, token || undefined);
      
      setFiles(filesData);
      setFolderPath(pathData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedFiles = useMemo(() => {
    if (!sortConfig) return files;
    
    return [...files].sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction;
      
      // Handle different data types for sorting
      if (key === 'size') {
        const aSize = a.size ? parseInt(a.size) : 0;
        const bSize = b.size ? parseInt(b.size) : 0;
        return direction === 'asc' ? aSize - bSize : bSize - aSize;
      }
      
      if (key === 'createdTime' || key === 'modifiedTime') {
        const aDate = a[key] ? new Date(a[key]!).getTime() : 0;
        const bDate = b[key] ? new Date(b[key]!).getTime() : 0;
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Default string comparison
      const aValue = a[key] as string || '';
      const bValue = b[key] as string || '';
      
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [files, sortConfig]);

  const handleSort = (key: keyof DriveFile) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchTerm(''); // Clear search when navigating to a new folder
  };

  const handleBreadcrumbClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchTerm(''); // Clear search when navigating via breadcrumbs
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  function openPdfPreview(file: DriveFile) {
    console.log('Opening PDF preview for file:', file);
    // Always use the public PDF proxy to ensure consistency and avoid 401 errors
    // The public proxy will work for publicly accessible files and return appropriate errors for private files
    const pdfProxyUrl = `/api/public/drive/pdf/${file.id}`;
    console.log('PDF proxy URL:', pdfProxyUrl);
    
    // Set the PDF preview directly without checking first
    // The PDF viewer will handle any errors
    setPdfPreview({
      url: pdfProxyUrl,
      name: file.name
    });
  }

  function closePdfPreview() {
    setPdfPreview(null);
  }

  // Show loading state
  if (loading && files.length === 0) {
    return (
      <div className={`p-6 flex items-center justify-center min-h-[300px] ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto"></div>
          <p className={`mt-4 text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading files...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && files.length === 0) {
    return (
      <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-red-900 border-l-4 border-red-500' : 'bg-red-50 border-l-4 border-red-500'}`} role="alert">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className={`h-6 w-6 ${darkMode ? 'text-red-300' : 'text-red-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-red-800'}`}>Error</h3>
              <div className={`mt-2 text-sm ${darkMode ? 'text-red-200' : 'text-red-700'}`}>
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => {
                    setError(null);
                    if (token) {
                      fetchFilesAndPath();
                    }
                  }}
                  className={`px-4 py-2 font-medium rounded-md transition-colors ${
                    darkMode 
                      ? 'bg-red-700 text-white hover:bg-red-600 focus:ring-red-500' 
                      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error message if there's an error but files are loaded
  const showError = error && files.length > 0;

  const filesToDisplay = sortedFiles;

  return (
    <div className={`p-6 max-w-7xl mx-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* PDF Viewer Modal */}
      {pdfPreview && (
        <PdfViewer 
          fileUrl={pdfPreview.url} 
          fileName={pdfPreview.name} 
          onClose={closePdfPreview} 
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Google Drive Files</h1>
        <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Browse and manage your Google Drive content</p>
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && (
        <div className="mb-6">
          <nav className="flex overflow-x-auto py-3" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-2 md:space-x-3">
              {folderPath.map((folder, index) => (
                <li key={folder.id} className="inline-flex items-center">
                  {index > 0 && (
                    <svg className="w-4 h-4 mx-1 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                  )}
                  <button
                    onClick={() => handleBreadcrumbClick(folder.id)}
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

      {/* Search and View Controls */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
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
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
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
                  ? 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600' 
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
                  ? 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600' 
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

      {/* Error Message */}
      {showError && (
        <div className={`mb-6 p-4 rounded-lg border ${
          darkMode 
            ? 'bg-red-900 text-red-200 border-red-700' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <div className="flex items-center">
            <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-red-300' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium">Error:</span>
            <span className="ml-2">{error}</span>
            <button 
              onClick={() => {
                setError(null);
                fetchFilesAndPath();
              }}
              className={`ml-auto px-3 py-1 rounded-md text-sm transition-colors ${
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

      {/* Files Display */}
      {filesToDisplay.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          </svg>
          <h3 className={`mt-2 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No files found</h3>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <GridView files={filesToDisplay} onFolderClick={handleFolderClick} openPdfPreview={openPdfPreview} darkMode={darkMode} />
      ) : (
        <TableView files={filesToDisplay} onFolderClick={handleFolderClick} onSort={handleSort} sortConfig={sortConfig} openPdfPreview={openPdfPreview} darkMode={darkMode} />
      )}
    </div>
  );
}

function GridView({ files, onFolderClick, openPdfPreview, darkMode }: { files: DriveFile[]; onFolderClick: (folderId: string) => void; openPdfPreview: (file: DriveFile) => void; darkMode: boolean; }) {
  const { token } = useAuth();
  
  // Function to get thumbnail URL
  const getThumbnailUrl = (fileId: string) => {
    // Use private thumbnail endpoint if authenticated, otherwise public
    console.log('Getting thumbnail URL for file ID:', fileId, 'Authenticated:', !!token);
    const backendUrl = getBackendUrl(); // Use the API utility function
    const url = token 
      ? `${backendUrl}/api/private/drive/thumbnail/${fileId}`
      : `${backendUrl}/api/public/drive/thumbnail/${fileId}`;
    console.log('Thumbnail URL:', url);
    return url;
  };
  
  // Function to get file icon based on mime type
  const getFileIcon = (mimeType: string, sizeClass: string = "w-8 h-8") => {
    if (mimeType.includes('image')) {
      return (
        <svg className={`${sizeClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <svg className={`${sizeClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('folder')) {
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('document')) {
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('video')) {
      return (
        <svg className={`${sizeClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('audio')) {
      return (
        <svg className={`${sizeClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
      );
    } else {
      return (
        <svg className={`${sizeClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    }
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {files.map((file) => (
        <div key={file.id} className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {file.mimeType === 'application/vnd.google-apps.folder' ? (
            // Folder view
            <button 
              onClick={() => onFolderClick(file.id)}
              className={`w-full h-32 flex flex-col items-center justify-center rounded-lg mb-4 transition-colors group ${
                darkMode ? 'bg-blue-900 hover:bg-blue-800' : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <div className="group-hover:scale-110 transition-transform duration-200">
                {getFileIcon(file.mimeType)}
              </div>
              <span className={`mt-3 font-medium text-sm ${
                darkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>Open Folder</span>
            </button>
          ) : (
            // File with thumbnail or icon
            <div className={`w-full h-32 rounded-lg mb-4 flex items-center justify-center relative ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              {file.thumbnailLink ? (
                <>
                  <img 
                    src={getThumbnailUrl(file.id)}
                    alt={file.name} 
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      // Hide the image on error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  {/* Fallback icon will be shown if image is hidden */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {getFileIcon(file.mimeType, "w-8 h-8")}
                  </div>
                </>
              ) : file.iconLink ? (
                <img 
                  src={file.iconLink} 
                  alt="File icon" 
                  className="w-12 h-12"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getFileIcon(file.mimeType)}
                </div>
              )}
            </div>
          )}
          <h3 className={`font-semibold truncate text-sm mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{file.name}</h3>
          <div className="flex flex-wrap items-center justify-between text-xs">
            <span className={`capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {file.mimeType.split('/')[1] || file.mimeType.split('/')[0]}
            </span>
            {file.size && (
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{formatFileSize(file.size)}</span>
            )}
          </div>
          {file.modifiedTime && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Modified: {new Date(file.modifiedTime).toLocaleDateString()}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {file.mimeType === 'application/vnd.google-apps.folder' ? (
              <>
                <button
                  onClick={() => onFolderClick(file.id)}
                  className={`flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => onFolderClick(file.id)}
                  className={`flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  View
                </button>
              </>
            ) : (
              <>
                <a 
                  href={file.webViewLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Download
                </a>
                {file.mimeType === 'application/pdf' && (
                  <button
                    onClick={() => openPdfPreview(file)}
                    className={`flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      darkMode 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    View
                  </button>
                )}
                {file.mimeType !== 'application/vnd.google-apps.folder' && file.webContentLink && (
                  <a
                    href={file.webContentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      darkMode 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Download
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({ files, onFolderClick, onSort, sortConfig, openPdfPreview, darkMode }: { 
  files: DriveFile[]; 
  onFolderClick: (folderId: string) => void;
  onSort: (key: keyof DriveFile) => void;
  sortConfig: { key: keyof DriveFile; direction: 'asc' | 'desc' } | null;
  openPdfPreview: (file: DriveFile) => void;
  darkMode: boolean;
}) {
  const { token } = useAuth();
  
  // Function to get thumbnail URL
  const getThumbnailUrl = (fileId: string) => {
    // Use private thumbnail endpoint if authenticated, otherwise public
    console.log('Getting thumbnail URL for file ID:', fileId, 'Authenticated:', !!token);
    const backendUrl = getBackendUrl(); // Use the API utility function
    const url = token 
      ? `${backendUrl}/api/private/drive/thumbnail/${fileId}`
      : `${backendUrl}/api/public/drive/thumbnail/${fileId}`;
    console.log('Thumbnail URL:', url);
    return url;
  };
  
  // Function to get file icon based on mime type
  const getFileIcon = (mimeType: string, sizeClass: string = "w-5 h-5") => {
    if (mimeType.includes('image')) {
      return (
        <svg className={`${sizeClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <svg className={`${sizeClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('folder')) {
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('document')) {
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('video')) {
      return (
        <svg className={`${sizeClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
      );
    } else if (mimeType.includes('audio')) {
      return (
        <svg className={`${sizeClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
      );
    } else {
      return (
        <svg className={`${sizeClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      );
    }
  };
  
  const getSortIndicator = (key: keyof DriveFile) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={`overflow-x-auto rounded-lg ${darkMode ? 'shadow-none' : 'shadow'}`}>
      <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
          <tr>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Preview</th>
            <th 
              className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-500'
              }`}
              onClick={() => onSort('name')}
            >
              <div className="flex items-center">
                Name {getSortIndicator('name')}
              </div>
            </th>
            <th 
              className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-500'
              }`}
              onClick={() => onSort('mimeType')}
            >
              <div className="flex items-center">
                Type {getSortIndicator('mimeType')}
              </div>
            </th>
            <th 
              className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-500'
              }`}
              onClick={() => onSort('size')}
            >
              <div className="flex items-center">
                Size {getSortIndicator('size')}
              </div>
            </th>
            <th 
              className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-500'
              }`}
              onClick={() => onSort('modifiedTime')}
            >
              <div className="flex items-center">
                Modified {getSortIndicator('modifiedTime')}
              </div>
            </th>
            <th className={`py-3 px-4 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
          {files.map((file) => (
            <tr key={file.id} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
              <td className={`py-3 px-4 whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {file.mimeType === 'application/vnd.google-apps.folder' ? (
                  <div className="flex items-center">
                    {getFileIcon(file.mimeType)}
                  </div>
                ) : file.thumbnailLink ? (
                  <div className="relative">
                    <img 
                      src={getThumbnailUrl(file.id)} 
                      alt="Thumbnail" 
                      className="w-10 h-10 object-cover rounded"
                      onError={(e) => {
                        // Hide the image on error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {/* Fallback icon will be shown if image is hidden */}
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getFileIcon(file.mimeType, "w-5 h-5")}
                    </div>
                  </div>
                ) : file.iconLink ? (
                  <img 
                    src={file.iconLink} 
                    alt="File icon" 
                    className="w-5 h-5"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center">
                    {getFileIcon(file.mimeType)}
                  </div>
                )}
              </td>
              <td className={`py-3 px-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <div className="flex items-center">
                  {file.mimeType === 'application/vnd.google-apps.folder' ? (
                    <button 
                      onClick={() => onFolderClick(file.id)}
                      className={`flex items-center hover:underline font-medium ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </button>
                  ) : (
                    <span className="font-medium truncate max-w-[150px]">{file.name}</span>
                  )}
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
                    <>
                      <button
                        onClick={() => onFolderClick(file.id)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => onFolderClick(file.id)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        View
                      </button>
                    </>
                  ) : (
                    <>
                      <a 
                        href={file.webViewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        Download
                      </a>
                      {file.mimeType === 'application/pdf' && (
                        <button
                          onClick={() => openPdfPreview(file)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            darkMode 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          View
                        </button>
                      )}
                      {file.mimeType !== 'application/vnd.google-apps.folder' && file.webContentLink && (
                        <a
                          href={file.webContentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            darkMode 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Download
                        </a>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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