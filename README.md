# Freedamn

## Overview
Freedamn is a web application with a NestJS backend and MongoDB database. This document provides information about the project structure and features.

## User Model

The User model in this application contains the following fields:

### Base Information
- **username**: Unique identifier for the user (required)
- **email**: User's email address (required, unique)
- **password**: User's password (required, stored securely)
- **firstName**: User's first name (required)
- **lastName**: User's last name (required)

### Profile Information
- **title**: User's professional title or role (optional)
- **location**: User's geographic location (optional)
- **avatar**: URL to user's profile picture (optional)
- **coverphoto**: URL to user's cover/banner image (optional)
- **birthdate**: User's date of birth (optional)
- **pronouns**: User's preferred pronouns - options are:
  - He/Him
  - She/Her
  - They/Them

### Account Settings
- **isActive**: Boolean flag indicating if the account is active (default: true)
- **roles**: Array of roles assigned to the user (default: ['user'])

### Social Media Links
The user can add links to their social media profiles:
- Facebook
- LinkedIn
- GitHub
- Twitter
- Instagram
- YouTube
- TikTok
- Personal website

## API Endpoints

### Authentication
- **POST /api/auth/register**: Register a new user
- **POST /api/auth/login**: Login with user credentials
- **GET /api/auth/profile**: Get authenticated user profile
- **POST /api/auth/test-user**: Create a predefined test user

### User Management
- **GET /api/users/me**: Get current user profile

## Getting Started

### Backend
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run start:dev
   ```

4. The API will be available at: http://localhost:3000/api

### Testing with REST Client
The project includes a REST client file at `backend/src/rest/all-routes.rest` that you can use to test API endpoints.

#### Workflow
1. Run the server: `npm run start:dev`
2. Create a test user: Use POST /auth/test-user
3. Login: Use POST /auth/login
4. Copy the access_token from the response
5. Update the @authToken variable at the top of the REST file
6. You can now make authenticated requests

## Project Structure
The application is divided into frontend and backend:

- **Backend**: NestJS application with MongoDB
- **Frontend**: [Frontend framework information - to be added]
