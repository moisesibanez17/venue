# Event Management Platform

A comprehensive event management platform built with Node.js, Express, Supabase, and Mercado Pago.

## Features

### For Users/Attendees
- 🎫 Browse and search events
- 🛒 Purchase tickets with multiple payment methods (Mercado Pago)
- 📧 Receive tickets via email with QR codes
- 📱 Download tickets as PDF
- 📊 View purchase history
- ⭐ Rate and review events

### For Event Organizers
- 📝 Create and manage events
- 🎟️ Configure multiple ticket types and pricing
- 📊 Real-time analytics and sales dashboard
- 👥 Attendee management and check-in
- 📥 Export attendee lists (CSV/Excel)
- 💰 Revenue tracking and reports
- 🔍 QR code scanning for event entry

### For Administrators
- 👨‍💼 Manage users and organizers
- 🎪 Oversee all events on the platform
- 📈 Platform-wide statistics
- ⚙️ System configuration

## Tech Stack

**Backend:**
- Node.js & Express
- Supabase (PostgreSQL)
- JWT Authentication
- Mercado Pago SDK

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Modern responsive design
- Progressive Web App ready

**Utilities:**
- QR Code generation
- PDF generation (PDFKit)
- Email service (Nodemailer)
- Excel export (ExcelJS)

## Installation

1. **Clone the repository**
```bash
cd event-management-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `JWT_SECRET`: Secret key for JWT tokens
- `MERCADOPAGO_ACCESS_TOKEN`: Mercado Pago access token
- `EMAIL_*`: Email service configuration

4. **Set up database**

Run the SQL schema in your Supabase SQL editor:

```bash
# Located in database/schema.sql
```

5. **Start the server**

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Project Structure

```
├── database/
│   └── schema.sql              # Database schema
├── public/                     # Frontend files
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── main.js
│   │   └── events.js
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── ...
├── src/
│   ├── config/                 # Configuration files
│   │   ├── database.js
│   │   ├── mercadopago.js
│   │   └── email.js
│   ├── controllers/            # Route controllers
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   ├── paymentController.js
│   │   ├── userController.js
│   │   └── organizerController.js
│   ├── middleware/             # Express middleware
│   │   ├── auth.js
│   │   ├── validate.js
│   │   ├── upload.js
│   │   └── errorHandler.js
│   ├── models/                 # Data models
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── Ticket.js
│   │   ├── Purchase.js
│   │   └── PromoCode.js
│   ├── routes/                 # API routes
│   │   ├── auth.routes.js
│   │   ├── event.routes.js
│   │   ├── payment.routes.js
│   │   ├── user.routes.js
│   │   └── organizer.routes.js
│   └── utils/                  # Utility functions
│       ├── qrGenerator.js
│       ├── pdfGenerator.js
│       ├── emailService.js
│       └── excelExporter.js
├── uploads/                    # Uploaded files
├── .env.example
├── .gitignore
├── package.json
└── server.js                   # Main server file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List all events (with filters)
- `GET /api/events/featured` - Get featured events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (organizer)
- `PUT /api/events/:id` - Update event (organizer)
- `DELETE /api/events/:id` - Delete event (organizer)

### Payments
- `POST /api/payments/create-preference` - Create Mercado Pago payment
- `POST /api/payments/webhook` - Mercado Pago webhook
- `GET /api/payments/verify/:purchaseId` - Verify payment status

### Organizer
- `GET /api/organizer/dashboard` - Dashboard statistics
- `GET /api/organizer/events/:eventId/attendees` - Get attendee list
- `GET /api/organizer/events/:eventId/export-attendees` - Export to Excel
- `POST /api/organizer/check-in` - Check-in ticket via QR

## Usage

### Creating an Event

1. Register as an organizer
2. Navigate to "Create Event"
3. Fill in event details (title, description, date, location)
4. Add ticket types with prices and quantities
5. Publish your event

### Buying Tickets

1. Browse events on the homepage
2. Click on an event to view details
3. Select ticket type and quantity
4. Proceed to checkout
5. Complete payment via Mercado Pago
6. Receive tickets via email

### Event Check-in

1. Organizers can access the check-in page
2. Scan attendee QR codes using device camera
3. System validates tickets in real-time
4. Track check-in statistics

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up email service (SendGrid/Mailgun)
- [ ] Configure Mercado Pago production credentials
- [ ] Set up file storage (Cloudinary/S3)
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email support@eventplatform.com or open an issue on GitHub.
