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
  
  const { token, logout } = useAuth();

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
    // Use the PDF proxy instead of direct link
    const pdfProxyUrl = `/api/private/drive/pdf/${file.id}`;
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
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-xl font-medium">Loading files...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && files.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md" role="alert">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
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
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
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
    <div className="p-6 max-w-7xl mx-auto">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Drive Files</h1>
        <p className="text-gray-600">Browse and manage your Google Drive content</p>
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
                        ? 'text-gray-500 cursor-default' 
                        : 'text-blue-600 hover:underline'
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-gray-50 p-4 rounded-lg">
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-md font-medium flex items-center ${
              viewMode === 'grid' 
                ? 'bg-blue-600 text-white shadow-md' 
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
                ? 'bg-blue-600 text-white shadow-md' 
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
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium">Error:</span>
            <span className="ml-2">{error}</span>
            <button 
              onClick={() => {
                setError(null);
                fetchFilesAndPath();
              }}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Files Display */}
      {filesToDisplay.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No files found</h3>
          <p className="mt-1 text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <GridView files={filesToDisplay} onFolderClick={handleFolderClick} openPdfPreview={openPdfPreview} />
      ) : (
        <TableView files={filesToDisplay} onFolderClick={handleFolderClick} onSort={handleSort} sortConfig={sortConfig} openPdfPreview={openPdfPreview} />
      )}
    </div>
  );
}

function GridView({ files, onFolderClick, openPdfPreview }: { files: DriveFile[]; onFolderClick: (folderId: string) => void; openPdfPreview: (file: DriveFile) => void; }) {
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
        <div key={file.id} className="border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
          {file.mimeType === 'application/vnd.google-apps.folder' ? (
            // Folder view
            <button 
              onClick={() => onFolderClick(file.id)}
              className="w-full h-32 flex flex-col items-center justify-center bg-blue-50 rounded-lg mb-4 hover:bg-blue-100 transition-colors group"
            >
              <div className="group-hover:scale-110 transition-transform duration-200">
                {getFileIcon(file.mimeType)}
              </div>
              <span className="mt-3 text-blue-700 font-medium text-sm">Open Folder</span>
            </button>
          ) : (
            // File with thumbnail or icon
            <div className="w-full h-32 rounded-lg mb-4 flex items-center justify-center bg-gray-50 relative">
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
          <h3 className="font-semibold text-gray-900 truncate text-sm mb-1">{file.name}</h3>
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500">
            <span className="capitalize">
              {file.mimeType.split('/')[1] || file.mimeType.split('/')[0]}
            </span>
            {file.size && (
              <span>{formatFileSize(file.size)}</span>
            )}
          </div>
          {file.modifiedTime && (
            <p className="text-xs text-gray-500 mt-1">
              Modified: {new Date(file.modifiedTime).toLocaleDateString()}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a 
              href={file.webViewLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View
            </a>
            {file.mimeType === 'application/pdf' && (
              <button
                onClick={() => openPdfPreview(file)}
                className="flex-1 min-w-[80px] text-center px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Preview
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({ files, onFolderClick, onSort, sortConfig, openPdfPreview }: { 
  files: DriveFile[]; 
  onFolderClick: (folderId: string) => void;
  onSort: (key: keyof DriveFile) => void;
  sortConfig: { key: keyof DriveFile; direction: 'asc' | 'desc' } | null;
  openPdfPreview: (file: DriveFile) => void;
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
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
            <th 
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center">
                Name {getSortIndicator('name')}
              </div>
            </th>
            <th 
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('mimeType')}
            >
              <div className="flex items-center">
                Type {getSortIndicator('mimeType')}
              </div>
            </th>
            <th 
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('size')}
            >
              <div className="flex items-center">
                Size {getSortIndicator('size')}
              </div>
            </th>
            <th 
              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('modifiedTime')}
            >
              <div className="flex items-center">
                Modified {getSortIndicator('modifiedTime')}
              </div>
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="py-3 px-4 whitespace-nowrap">
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
              <td className="py-3 px-4">
                <div className="flex items-center">
                  {file.mimeType === 'application/vnd.google-apps.folder' ? (
                    <button 
                      onClick={() => onFolderClick(file.id)}
                      className="flex items-center text-blue-600 hover:underline font-medium"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </button>
                  ) : (
                    <span className="font-medium truncate max-w-[150px]">{file.name}</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                  {file.mimeType.split('/')[1] || file.mimeType.split('/')[0]}
                </span>
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                {file.size ? formatFileSize(file.size) : 'N/A'}
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-sm font-medium">
                <div className="flex flex-wrap gap-2">
                  <a 
                    href={file.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    View
                  </a>
                  {file.mimeType === 'application/pdf' && (
                    <button
                      onClick={() => openPdfPreview(file)}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Preview
                    </button>
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