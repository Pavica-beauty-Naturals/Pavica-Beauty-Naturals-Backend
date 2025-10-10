# Testing Product Creation

## API Endpoint

`POST /api/products`

## Required Headers

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

## Required Fields

- `name` (string): Product name
- `categoryId` (string): Valid MongoDB ObjectId of existing category
- `price` (number): Product price

## Optional Fields

- `description` (string): Product description
- `sizeQuantity` (string): Size/quantity info
- `qualities` (array or comma-separated string): Product qualities
- `productFeatures` (array or comma-separated string): Product features
- `howToUse` (array or comma-separated string): How to use instructions
- `stockQuantity` (number): Stock quantity
- `images` (files): Up to 3 image files

## Example using curl:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=Test Product" \
  -F "categoryId=CATEGORY_ID_HERE" \
  -F "price=99.99" \
  -F "description=Test product description" \
  -F "qualities=Natural,Organic" \
  -F "productFeatures=Feature 1,Feature 2" \
  -F "howToUse=Use daily,Apply gently" \
  -F "stockQuantity=100" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg"
```

## Image Response Format:

```json
{
  "status": "success",
  "data": {
    "product": {
      "_id": "product_id",
      "name": "Test Product",
      "images": [
        {
          "_id": "image_id_1",
          "url": "https://res.cloudinary.com/your_cloud/image/upload/...",
          "public_id": "pavica-naturals/products/image1",
          "type": "product",
          "alt": "Product image 1"
        },
        {
          "_id": "image_id_2",
          "url": "https://res.cloudinary.com/your_cloud/image/upload/...",
          "public_id": "pavica-naturals/products/image2",
          "type": "model",
          "alt": "Product image 2"
        },
        {
          "_id": "image_id_3",
          "url": "https://res.cloudinary.com/your_cloud/image/upload/...",
          "public_id": "pavica-naturals/products/image3",
          "type": "use_case",
          "alt": "Product image 3"
        }
      ]
    }
  }
}
```

## Example using Postman:

1. Set method to POST
2. URL: `http://localhost:3000/api/products`
3. Headers: Add `Authorization: Bearer YOUR_JWT_TOKEN`
4. Body: Select `form-data`
5. Add fields:
   - name: Test Product
   - categoryId: YOUR_CATEGORY_ID
   - price: 99.99
   - description: Test description
   - qualities: Natural,Organic
   - productFeatures: Feature 1,Feature 2
   - howToUse: Use daily,Apply gently
   - stockQuantity: 100
   - images: (Select files)

## Additional Endpoints:

### Delete Specific Image:

```bash
DELETE /api/products/:productId/images/:imageId
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

### Update Product (add more images):

```bash
PUT /api/products/:id
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
- images: (upload additional files)
```

## Notes:

- Make sure you have a valid category created first
- The `qualities`, `productFeatures`, and `howToUse` fields can be sent as:
  - JSON arrays: `["item1", "item2"]`
  - Comma-separated strings: `"item1,item2"`
- Images are uploaded to Cloudinary and URLs are stored in the database
- Images are stored in an array with the following structure:
  - `url`: Cloudinary URL
  - `public_id`: Cloudinary public ID for deletion
  - `type`: "product", "model", "use_case", or "gallery"
  - `alt`: Alt text for accessibility
- You can upload unlimited images (not just 3)
- Each image gets a unique ID for individual deletion
