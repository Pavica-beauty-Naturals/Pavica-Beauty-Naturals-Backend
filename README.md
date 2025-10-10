# Pavica Naturals Backend API

A comprehensive Node.js backend API for the Pavica Naturals ecommerce platform, built with Express.js, MongoDB, and Cloudinary.

## Features

- **User Authentication & Management**: JWT-based authentication with role-based access control
- **Product Management**: CRUD operations for products with image uploads via Cloudinary
- **Order Management**: Complete order lifecycle with status tracking
- **Payment Integration**: Razorpay payment gateway integration
- **Shopping Cart**: Add, update, and manage cart items
- **Review System**: Product reviews and ratings
- **Admin Portal**: Comprehensive admin dashboard and management tools
- **File Upload**: Secure image uploads with Cloudinary
- **Data Validation**: Comprehensive input validation and sanitization

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Payment**: Razorpay
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
pavica_naturals_backend/
├── controllers/           # Business logic controllers
│   ├── adminController.js
│   ├── authController.js
│   ├── cartController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── productController.js
│   ├── reviewController.js
│   └── userController.js
├── middleware/           # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   ├── upload.js
│   └── validation.js
├── models/              # MongoDB models with Mongoose
│   ├── User.js
│   ├── Product.js
│   ├── Category.js
│   ├── Review.js
│   ├── Cart.js
│   ├── Order.js
│   └── Payment.js
├── routes/              # API routes
│   ├── admin.js
│   ├── auth.js
│   ├── cart.js
│   ├── orders.js
│   ├── payments.js
│   ├── products.js
│   ├── reviews.js
│   └── users.js
├── config/              # Configuration files
│   ├── cloudinary.js
│   ├── database.js
│   └── razorpay.js
├── uploads/             # Temporary file uploads
├── server.js            # Main application entry point
├── package.json
└── README.md
```

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pavica_naturals_backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env
   ```

   Fill in your environment variables in `.env`:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://shubhamdevops58_db_user:KEyYlR6PlInSgJX2@pavicadb.pf2i0zd.mongodb.net/pavica-naturals?retryWrites=true&w=majority

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=7d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Database Setup**

   - MongoDB connection is configured to use the provided MongoDB Atlas cluster
   - The application will automatically create collections and indexes on first run
   - No additional setup required for MongoDB

5. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Documentation

### Authentication Endpoints

| Method | Endpoint                    | Description              | Access  |
| ------ | --------------------------- | ------------------------ | ------- |
| POST   | `/api/auth/register`        | Register new user        | Public  |
| POST   | `/api/auth/login`           | User login               | Public  |
| GET    | `/api/auth/me`              | Get current user profile | Private |
| POST   | `/api/auth/change-password` | Change user password     | Private |
| POST   | `/api/auth/verify-token`    | Verify JWT token         | Private |

### Product Endpoints

| Method | Endpoint                   | Description                     | Access |
| ------ | -------------------------- | ------------------------------- | ------ |
| GET    | `/api/products`            | Get all products (with filters) | Public |
| GET    | `/api/products/:id`        | Get single product              | Public |
| GET    | `/api/products/categories` | Get all categories              | Public |
| POST   | `/api/products`            | Create new product              | Admin  |
| PUT    | `/api/products/:id`        | Update product                  | Admin  |
| DELETE | `/api/products/:id`        | Delete product                  | Admin  |

### Cart Endpoints

| Method | Endpoint             | Description                   | Access  |
| ------ | -------------------- | ----------------------------- | ------- |
| GET    | `/api/cart`          | Get user's cart               | Private |
| POST   | `/api/cart`          | Add item to cart              | Private |
| PUT    | `/api/cart/:id`      | Update cart item              | Private |
| DELETE | `/api/cart/:id`      | Remove item from cart         | Private |
| DELETE | `/api/cart`          | Clear entire cart             | Private |
| POST   | `/api/cart/validate` | Validate cart before checkout | Private |

### Order Endpoints

| Method | Endpoint                 | Description         | Access  |
| ------ | ------------------------ | ------------------- | ------- |
| GET    | `/api/orders`            | Get user's orders   | Private |
| GET    | `/api/orders/:id`        | Get order details   | Private |
| POST   | `/api/orders`            | Create new order    | Private |
| PUT    | `/api/orders/:id/cancel` | Cancel order        | Private |
| GET    | `/api/orders/admin/all`  | Get all orders      | Admin   |
| PUT    | `/api/orders/:id/status` | Update order status | Admin   |

### Payment Endpoints

| Method | Endpoint                          | Description           | Access  |
| ------ | --------------------------------- | --------------------- | ------- |
| POST   | `/api/payments/create-order`      | Create Razorpay order | Private |
| POST   | `/api/payments/verify`            | Verify payment        | Private |
| POST   | `/api/payments/failed`            | Handle failed payment | Private |
| GET    | `/api/payments/:orderId`          | Get payment details   | Private |
| POST   | `/api/payments/:paymentId/refund` | Process refund        | Admin   |

### Review Endpoints

| Method | Endpoint                          | Description         | Access  |
| ------ | --------------------------------- | ------------------- | ------- |
| GET    | `/api/reviews/product/:productId` | Get product reviews | Public  |
| POST   | `/api/reviews`                    | Create review       | Private |
| PUT    | `/api/reviews/:id`                | Update review       | Private |
| DELETE | `/api/reviews/:id`                | Delete review       | Private |
| GET    | `/api/reviews/user`               | Get user's reviews  | Private |

### User Management Endpoints

| Method | Endpoint                   | Description         | Access  |
| ------ | -------------------------- | ------------------- | ------- |
| GET    | `/api/users/profile`       | Get user profile    | Private |
| PUT    | `/api/users/profile`       | Update user profile | Private |
| POST   | `/api/users/addresses`     | Add user address    | Private |
| GET    | `/api/users/addresses`     | Get user addresses  | Private |
| PUT    | `/api/users/addresses/:id` | Update address      | Private |
| DELETE | `/api/users/addresses/:id` | Delete address      | Private |
| GET    | `/api/users`               | Get all users       | Admin   |

### Admin Endpoints

| Method | Endpoint                      | Description         | Access |
| ------ | ----------------------------- | ------------------- | ------ |
| GET    | `/api/admin/dashboard`        | Get dashboard stats | Admin  |
| GET    | `/api/admin/categories`       | Get all categories  | Admin  |
| POST   | `/api/admin/categories`       | Create category     | Admin  |
| PUT    | `/api/admin/categories/:id`   | Update category     | Admin  |
| DELETE | `/api/admin/categories/:id`   | Delete category     | Admin  |
| GET    | `/api/admin/products`         | Get all products    | Admin  |
| GET    | `/api/admin/users`            | Get all users       | Admin  |
| PUT    | `/api/admin/users/:id/status` | Update user status  | Admin  |
| GET    | `/api/admin/orders`           | Get all orders      | Admin  |
| GET    | `/api/admin/reviews`          | Get all reviews     | Admin  |

## Data Models

### User

- id, email, password_hash, first_name, last_name, phone
- role (admin/customer), is_active, email_verified
- created_at, updated_at

### Product

- id, name, description, category_id, price, size_quantity
- product_image_url, model_image_url, use_case_image_url
- qualities (JSON), product_features (JSON), how_to_use (JSON)
- stock_quantity, is_active
- created_at, updated_at

### Order

- id, order_number, user_id, total_amount, shipping_amount
- discount_amount, final_amount, status, payment_status
- shipping_address (JSON), billing_address (JSON), notes
- created_at, updated_at

### Cart

- id, user_id, product_id, quantity
- created_at, updated_at

### Review

- id, product_id, user_id, user_name, rating, title, description
- created_at, updated_at

### Payment

- id, order_id, razorpay_payment_id, razorpay_order_id
- amount, currency, status, payment_method
- transaction_details (JSON)
- created_at, updated_at

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and customer roles
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers and protection
- **Password Hashing**: bcrypt password hashing
- **File Upload Security**: Secure file upload with validation

## Error Handling

The API uses a centralized error handling middleware that:

- Catches and formats all errors consistently
- Provides meaningful error messages
- Logs errors for debugging
- Returns appropriate HTTP status codes

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Code Structure

- **Controllers**: Handle business logic and database operations using Mongoose
- **Routes**: Define API endpoints and middleware
- **Middleware**: Authentication, validation, error handling
- **Models**: MongoDB schemas with Mongoose ODM, including aggregation pipelines
- **Config**: External service configurations (MongoDB, Cloudinary, Razorpay)

## Deployment

1. **Environment Variables**: Set all required environment variables
2. **Database**: Ensure MongoDB connection is properly configured
3. **File Storage**: Configure Cloudinary settings
4. **Payment Gateway**: Set up Razorpay credentials
5. **SSL**: Use HTTPS in production
6. **Process Manager**: Use PM2 or similar for process management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
