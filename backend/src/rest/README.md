# REST API Testing Documentation

This directory contains `.rest` files for testing the API endpoints. These files can be used with the REST Client extension in VS Code or similar tools to send HTTP requests to your API.

## Using all-routes.rest

The `all-routes.rest` file contains examples of all the available API endpoints in the application. Here's how to use it:

1. Make sure you have the REST Client extension installed in VS Code
2. Open the `all-routes.rest` file
3. Set the `@baseUrl` variable to your API's URL (default is http://localhost:3000/api)
4. After logging in, set the `@authToken` variable to the JWT token received from the login response

## Available Endpoints

### Authentication
- **POST /api/auth/register**: Register a new user with the following fields:
  - username (required)
  - email (required)
  - password (required)
  - firstName (required)
  - lastName (required)
  - title (optional)
  - location (optional)
  - avatar (optional) - URL to user's profile picture
  - coverphoto (optional) - URL to user's cover image
  - birthdate (optional) - in YYYY-MM-DD format
  - pronouns (optional) - one of: "He/Him", "She/Her", "They/Them"
  - socials (optional) - social media links

- **POST /api/auth/login**: Login with username and password
- **GET /api/auth/profile**: Get the authenticated user's profile
- **POST /api/auth/test-user**: Create a predefined test user for testing

### User Management
- **GET /api/users/me**: Get the current authenticated user's details

## Troubleshooting

- If you receive a 401 Unauthorized error, your token may be missing, invalid, or expired. Try logging in again.
- If you receive a 404 Not Found error, the endpoint may not exist or you might be using the wrong URL.
- If you receive a 409 Conflict error, you might be trying to create a resource that already exists (like a user with the same username).
- If you receive a 500 Server Error, something went wrong on the server. Check the server logs for more details. 