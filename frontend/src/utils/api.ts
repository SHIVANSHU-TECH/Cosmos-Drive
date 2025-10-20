// Utility functions for API calls
export const getBackendUrl = (): string => {
  // In production, use the NEXT_PUBLIC_BACKEND_URL environment variable
  // In development, default to localhost:3001
  if (typeof window !== 'undefined') {
    // Client-side check
    console.log('Client-side environment variables:', {
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      NODE_ENV: process.env.NODE_ENV
    });
  }
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  // Remove trailing slash if present
  const cleanBackendUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
  console.log('Using backend URL:', cleanBackendUrl);
  return cleanBackendUrl;
};

// Fetch with timeout and retry logic (more balanced approach)
const fetchWithTimeoutAndRetry = async (url: string, options: RequestInit = {}, timeout: number = 15000, retries: number = 2): Promise<Response> => {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If it's a 504 (timeout) and we have retries left, try again
      if (response.status === 504 && i < retries) {
        console.log(`Attempt ${i + 1} failed with 504, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second backoff
        continue;
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // If it's an abort error (timeout) and we have retries left, try again
      if (error.name === 'AbortError' && i < retries) {
        console.log(`Attempt ${i + 1} timed out, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second backoff
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('All retry attempts failed');
};

export const getAuthUrl = async (): Promise<string> => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/auth/url`;
  console.log('Making request to:', url);
  
  try {
    const response = await fetchWithTimeoutAndRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, 10000, 2); // 10 second timeout, 2 retries
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get authentication URL: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.authUrl;
  } catch (error) {
    console.error('Error fetching auth URL:', error);
    throw error;
  }
};

export const fetchFiles = async (endpoint: string, folderId: string, token?: string, searchTerm?: string) => {
  const backendUrl = getBackendUrl();
  const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
  const url = `${backendUrl}/api/${endpoint}/drive/folder/${folderId}${searchParam}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetchWithTimeoutAndRetry(url, { 
    headers,
    // Cache for 2 minutes
    cache: 'force-cache'
  }, 15000, 2); // 15 second timeout, 2 retries
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchFolderPath = async (endpoint: string, folderId: string, token?: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/${endpoint}/drive/path/${folderId}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetchWithTimeoutAndRetry(url, { 
    headers,
    // Cache for 3 minutes
    cache: 'force-cache'
  }, 12000, 2); // 12 second timeout, 2 retries
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch folder path: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchEmbedFiles = async (folderId: string, apiKey: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/embed/folder/${folderId}`;
  
  const response = await fetchWithTimeoutAndRetry(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    // Cache for 2 minutes
    cache: 'force-cache'
  }, 20000, 2); // 20 second timeout, 2 retries for embed
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchPdf = async (fileId: string, token: string) => {
  const backendUrl = getBackendUrl();
  // Use the public PDF endpoint to avoid 401 errors
  const url = `${backendUrl}/api/public/drive/pdf/${fileId}`;
  
  const response = await fetchWithTimeoutAndRetry(url, {}, 25000, 2); // 25 second timeout, 2 retries for PDF
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  
  return await response.arrayBuffer();
};

// New function for API key creation
export const createApiKey = async (email: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/users/key`;
  
  const response = await fetchWithTimeoutAndRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  }, 15000, 2); // 15 second timeout, 2 retries for API key creation
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to create API key: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};