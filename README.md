# FreeDamn

A modern social media platform focused on freedom of expression and community engagement.

## Overview

FreeDamn is a full-stack web application built with Angular (frontend) and NestJS (backend) that allows users to share thoughts, media, and engage with others in a meaningful way.

## Features

- User authentication and authorization
- Blog post creation and management
- Comment/Like/Bookmark system
- Media upload support
- Real-time notifications
- User profiles

## Tech Stack

### Frontend
- Angular19
- TypeScript
- Tailwind CSS
- Font Awesome Icons
- Daisy UI

### Backend
- NestJS
- TypeScript
- MongoDB (with Mongoose)
- Cloudinary (for media storage)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB cluster (mongodb atlas)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/juniel999/angular-nestjs-freedamn
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Configure environment variables:
- Copy `.env.example` to `.env` in the backend directory
- Update the variables with your configuration

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run start:dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run start
```

The application will be available at `http://localhost:4200`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.