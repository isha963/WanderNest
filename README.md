# WanderNest

WanderNest is a full-stack rental listing and booking website inspired by Airbnb. Users can explore different places to stay, create their own listings, and book properties.

## Features

- User signup, login, and email verification
- Create, edit, and delete property listings
- Upload listing images
- View property locations on a map
- Add reviews to listings
- Book properties and manage booking requests
- Approve or reject booking requests
- Online payments using Razorpay
- Email notifications for bookings
- Responsive design for different screen sizes

## Tech Stack

**Frontend:** EJS, HTML, CSS, Bootstrap, JavaScript

**Backend:** Node.js, Express.js

**Database:** MongoDB, Mongoose

**Authentication:** Passport.js, Express Session

**Other Services:** Cloudinary, Mapbox, Razorpay, Google Apps Script, Nodemailer

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/isha963/WanderNest.git
   ```

2. Go to the project directory:

   ```bash
   cd WanderNest
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the root directory and add the required environment variables.

5. Start the application:

   ```bash
   npm start
   ```

   If your project uses a different start script, use the appropriate command from `package.json`.

## Environment Variables

Add the required configuration to your `.env` file. These may include:

- `MONGO_URI`
- `SECRET`
- `BASE_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_KEY`
- `CLOUDINARY_SECRET`
- `MAP_TOKEN`
- Razorpay API credentials
- Email service configuration

Keep your `.env` file private and never upload API keys or passwords to GitHub.

## Live Demo

[WanderNest](https://wandernest-023r.onrender.com/)

## Author

Isha Bisht

Built as a learning project to practice full-stack web development.