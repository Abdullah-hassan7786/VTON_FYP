/**
 * IDM-VTON Virtual Try-On Service
 * Uses backend API to call Hugging Face IDM-VTON Space for generating try-on images.
 * Previously used Google Gemini, now replaced with IDM-VTON for better consistency.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN; // Optional, for rate limiting

/**
 * Convert a File object → base64 string (with data-URI prefix)
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Keep the "data:image/xxx;base64," prefix for API transmission
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch a remote image URL and return base64 string with data-URI prefix
 */
async function urlToBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // Keep the data-URI prefix
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      // fallback: fetch via proxy
      fetch(imageUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Keep the data-URI prefix
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    };
    img.src = imageUrl;
  });
}

/**
 * Generate a virtual try-on image using IDM-VTON via backend API.
 *
 * @param {File}   userImageFile  - The user's uploaded photo (File object)
 * @param {object} clothingItem   - The clothing item object from mockClothingData
 * @returns {Promise<object>}      - { base64: base64_string, mimeType: 'image/...' }
 * @throws {Error} - If try-on generation fails
 */
export async function generateTryOnImage(userImageFile, clothingItem) {
  try {
    // 1. Validate inputs
    if (!userImageFile) {
      throw new Error('User image file is required.');
    }
    if (!clothingItem || !clothingItem.image) {
      throw new Error('Clothing item with image is required.');
    }

    console.log('Starting IDM-VTON try-on generation...');

    // 2. Convert user photo to base64
    const userBase64 = await fileToBase64(userImageFile);
    console.log('User image converted to base64');

    // 3. Fetch the clothing item's image as base64
    const clothingBase64 = await urlToBase64(clothingItem.image);
    console.log('Clothing image converted to base64');

    // 4. Call the backend API
    // Build a description from the clothing item details
    const garmentDescription = [
      clothingItem.name,
      clothingItem.category,
      clothingItem.primaryColor && `in ${clothingItem.primaryColor}`,
      clothingItem.brand && `by ${clothingItem.brand}`,
    ]
      .filter(Boolean)
      .join(', ');
    
    const requestBody = {
      user_image: userBase64,
      clothing_image: clothingBase64,
      garment_description: garmentDescription || "a clothing item",
    };
    
    // Only include HF token if it's defined
    if (HF_TOKEN && HF_TOKEN.trim()) {
      requestBody.hf_token = HF_TOKEN;
    }
    
    console.log('Sending request to backend...', {
      userImageLength: userBase64.length,
      clothingImageLength: clothingBase64.length,
      hasToken: !!requestBody.hf_token,
    });

    const response = await fetch(`${API_BASE_URL}/api/tryon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`Backend response status: ${response.status}`);

    // 5. Handle response
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData?.detail || `HTTP ${response.status}`;
      
      // Provide user-friendly error messages
      let userMessage = errorMessage;
      if (response.status === 504) {
        userMessage = 'The try-on service is taking longer than expected. This might be the first request. Please try again in a moment.';
      } else if (response.status === 429) {
        userMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (response.status === 503) {
        userMessage = 'The try-on service is temporarily unavailable. Please try again later.';
      } else if (response.status === 400) {
        userMessage = 'Invalid image format or size. Please try with a different image.';
      }
      
      throw new Error(`Try-on generation failed: ${userMessage}`);
    }

    const data = await response.json();

    // 6. Validate response
    if (data.status !== 'success') {
      throw new Error(`Try-on failed: ${data.message || 'Unknown error'}`);
    }

    if (!data.generated_image) {
      throw new Error('No image was generated. Please try again.');
    }

    console.log('Try-on generation completed successfully');

    // 7. Return the result with base64 and MIME type
    // Strip the data URI prefix if it exists to avoid double-prefixing in the UI
    let base64Data = data.generated_image;
    if (base64Data && base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    return {
      base64: base64Data,
      mimeType: 'image/jpeg', // IDM-VTON typically returns JPEG
    };
  } catch (error) {
    console.error('Try-on generation error:', error);
    throw error;
  }
}

/**
 * Check backend health and connectivity
 * Useful for validating setup before trying to generate images
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

