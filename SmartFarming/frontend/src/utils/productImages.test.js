import getProductImage, { PLACEHOLDER_IMG, CATEGORY_IMAGES } from './productImages';

describe('productImages utility', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('returns placeholder image when product is null or undefined', () => {
    expect(getProductImage(null)).toBe(PLACEHOLDER_IMG);
    expect(getProductImage(undefined)).toBe(PLACEHOLDER_IMG);
  });

  test('returns placeholder image when product name is empty and no valid image is provided', () => {
    expect(getProductImage({})).toBe(PLACEHOLDER_IMG);
    expect(getProductImage({ name: '' })).toBe(PLACEHOLDER_IMG);
  });

  test('returns user-uploaded image_url if it is a valid Cloudinary/Firebase/AWS URL', () => {
    const validCloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/v123/prod.jpg';
    const product = { name: 'Tomato', image_url: validCloudinaryUrl };
    expect(getProductImage(product)).toBe(validCloudinaryUrl);
  });

  test('returns user-uploaded image if it is a valid URL', () => {
    const validFirebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/test/o/image.jpg';
    const product = { name: 'Tomato', image: validFirebaseUrl };
    expect(getProductImage(product)).toBe(validFirebaseUrl);
  });

  test('returns valid image from images list if available', () => {
    const validAwsUrl = 'https://test.amazonaws.com/bucket/image.jpg';
    const product = { name: 'Tomato', images: [validAwsUrl] };
    expect(getProductImage(product)).toBe(validAwsUrl);
  });

  test('returns category fallback when exact product is not in cache', () => {
    const product = { name: 'Uncached Product', category: 'vegetables' };
    expect(getProductImage(product)).toBe(CATEGORY_IMAGES['vegetables']);
  });

  test('returns default placeholder when category is uncached/unknown and product is uncached', () => {
    const product = { name: 'Uncached Product', category: 'unknown-category' };
    expect(getProductImage(product)).toBe(PLACEHOLDER_IMG);
  });
});
