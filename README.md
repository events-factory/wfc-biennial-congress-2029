# Abstract Management System

A comprehensive Next.js application for managing conference abstract submissions and reviews.

## Features

### For Submitters
- User registration and login
- Submit abstracts with rich text editor (CKEditor 5)
- Complete form with all required fields:
  - Email
  - Sub-Theme Category
  - Abstract Title (max 15 words)
  - Author Information
  - Type of Presentation
  - Presenter Details (name, email, phone, institution, country)
  - Optional Dean/Provost contact
  - Abstract Body (max 300 words with rich text formatting)

### For Reviewers (Staff)
- User registration and login
- Dashboard to view all submitted abstracts
- Filter abstracts by status (pending, approved, rejected, info requested)
- Detailed abstract preview
- Comment on abstracts
- Action buttons to:
  - Request more information
  - Add comments for feedback

### For Super Admins
- All reviewer capabilities plus:
  - **Approve abstracts** with points (0-10) and optional notes
  - **Reject abstracts** with feedback
  - Full control over abstract status management

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Rich Text Editor**: CKEditor 5
- **State Management**: React Hooks

## Brand Colors

The application uses the following color scheme:
- Primary: #165fac (Blue)
- Secondary: #52b2e4 (Light Blue)
- Accent Green: #bbd758
- Accent Red: #ef4545

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd abstract-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and update the API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integration

The application is designed to work with a backend API. You need to implement the following endpoints:

### Authentication Endpoints

#### POST /api/auth/login
Request:
```json
{
  "email": "string",
  "password": "string",
  "role": "submitter" | "reviewer"
}
```
Response:
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "submitter" | "reviewer",
    "createdAt": "string"
  },
  "token": "string"
}
```

#### POST /api/auth/register
Request:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "submitter" | "reviewer"
}
```
Response: Same as login

### Abstract Endpoints

#### POST /api/abstracts
Create a new abstract (requires authentication)
Request:
```json
{
  "email": "string",
  "subThemeCategory": "string",
  "title": "string",
  "authorInformation": "string",
  "presentationType": "string",
  "presenterFullName": "string",
  "presenterEmail": "string",
  "presenterPhone": "string",
  "presenterInstitution": "string",
  "presenterCountry": "string",
  "deanContact": "string",
  "abstractBody": "string",
  "submittedBy": "string"
}
```

#### GET /api/abstracts
Get all abstracts (requires reviewer authentication)
Response:
```json
[
  {
    "id": "string",
    "email": "string",
    "subThemeCategory": "string",
    "title": "string",
    "authorInformation": "string",
    "presentationType": "string",
    "presenterFullName": "string",
    "presenterEmail": "string",
    "presenterPhone": "string",
    "presenterInstitution": "string",
    "presenterCountry": "string",
    "deanContact": "string",
    "abstractBody": "string",
    "status": "pending" | "approved" | "rejected" | "info_requested",
    "submittedBy": "string",
    "submittedAt": "string",
    "reviewedBy": "string",
    "reviewedAt": "string"
  }
]
```

#### GET /api/abstracts/:id
Get a single abstract by ID (requires reviewer authentication)

#### PATCH /api/abstracts/:id/status
Update abstract status (requires reviewer authentication)
Request:
```json
{
  "status": "pending" | "approved" | "rejected" | "info_requested",
  "reviewNote": "string"
}
```

### Comment Endpoints

#### POST /api/comments
Create a new comment (requires reviewer authentication)
Request:
```json
{
  "abstractId": "string",
  "content": "string"
}
```
Response:
```json
{
  "id": "string",
  "abstractId": "string",
  "userId": "string",
  "userName": "string",
  "content": "string",
  "createdAt": "string"
}
```

#### GET /api/comments/:abstractId
Get all comments for an abstract (requires reviewer authentication)

## Project Structure

```
abstract-management/
├── app/
│   ├── abstracts/
│   │   └── [id]/
│   │       └── page.tsx          # Abstract detail/review page
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── register/
│   │       └── page.tsx          # Registration page
│   ├── dashboard/
│   │   └── page.tsx              # Reviewer dashboard
│   ├── submit/
│   │   ├── success/
│   │   │   └── page.tsx          # Success page after submission
│   │   └── page.tsx              # Abstract submission form
│   ├── globals.css               # Global styles and Tailwind config
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   └── RichTextEditor.tsx        # CKEditor 5 wrapper component
├── lib/
│   ├── api.ts                    # API client functions
│   └── types.ts                  # TypeScript type definitions
├── public/                       # Static assets
├── .env.example                  # Environment variables template
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Building for Production

```bash
npm run build
npm run start
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: The base URL for your backend API

## Notes

- The application uses localStorage for storing authentication tokens
- All API calls include the authentication token in the Authorization header
- The rich text editor (CKEditor 5) is dynamically imported to avoid SSR issues
- Form validation is implemented on both client and server side
- Word count limits are enforced for title (15 words) and abstract body (300 words)

## License

MIT

## Support

For issues or questions, please contact the development team.
