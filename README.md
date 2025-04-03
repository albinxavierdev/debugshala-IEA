# DebugShala Skill Assessment Platform

![DebugShala Logo](/public/images/dslogo.svg)

## Overview

DebugShala Skill Assessment is a Next.js-based web application designed to evaluate technical and soft skills of candidates. The platform offers personalized assessments in three main areas:

1. **Aptitude & Reasoning** - Evaluates logical reasoning, numerical ability, and problem-solving skills
2. **Programming** - Tests coding skills, technical knowledge, and software development abilities
3. **Employability** - Assesses soft skills, professional development, communication, teamwork, leadership, problem-solving, and domain knowledge

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Getting Started](#getting-started)
- [Development Guidelines](#development-guidelines)
- [Common Tasks](#common-tasks)
- [API Integration](#api-integration)
- [UI/UX Design System](#uiux-design-system)
- [External Services](#external-services)
- [Build & Deployment](#build--deployment)
- [Troubleshooting](#troubleshooting)
- [Important Notes](#important-notes)

## Technology Stack

- **Framework**: Next.js 13.4 (App Router)
- **UI Library**: React 18
- **Styling**: TailwindCSS 3.3
- **UI Components**: Shadcn UI
- **Animations**: Framer Motion 12.6
- **Icons**: Lucide React
- **Charts**: Recharts, Chart.js
- **AI Integration**: Google Gemini API, OpenAI (optional)
- **Database**: Supabase
- **External Services**: WhatsApp Chat Widget (Bizfy)

## Project Structure

```
skillassessment/
├── public/
│   └── images/
│       └── dslogo.svg
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   └── questions/
│   │   │       └── gemini/ # AI-powered question generation
│   │   ├── assessment/     # Assessment-related pages
│   │   │   ├── results/    # Results display page
│   │   │   └── test/       # Test-taking page
│   │   ├── page.tsx        # Home page
│   │   └── layout.tsx      # Root layout
│   ├── components/
│   │   ├── ui/             # Reusable UI components
│   │   │   ├── navbar.tsx  # Navigation bar
│   │   │   └── button.tsx  # Button component
│   │   └── ... other components
│   ├── images/             # Source images
│   ├── lib/
│   │   ├── gemini.ts       # Gemini AI integration
│   │   ├── openai.ts       # OpenAI integration
│   │   ├── supabase.ts     # Supabase client
│   │   ├── assessment-service.ts # Assessment logic
│   │   └── utils.ts        # Utility functions
│   └── types/              # TypeScript type definitions
│       └── assessment.ts   # Assessment-related types
└── ... config files
```

## Key Components

### 1. Navigation

The Navbar (`src/components/ui/navbar.tsx`) is a key component that provides site-wide navigation with dropdown menus for:
- "For Companies" - Services for businesses
- "For Talent" - Educational and career opportunities
- "Success Stories" - Showcasing successful candidates
- "Explore More" button - Links to the main DebugShala website

### 2. Assessment System

The assessment system consists of several pages:
- `src/app/assessment/test/page.tsx` - Handles test delivery for all question types
- `src/app/assessment/results/page.tsx` - Displays detailed results with visualizations

The system uses:
- Section-wise analysis
- Skill gap identification
- Visual representations (charts)
- Personalized recommendations

### 3. Question Generation

Questions are generated through:
- The Gemini AI integration (`src/lib/gemini.ts`)
- API endpoint at `src/app/api/questions/gemini/route.ts`

The system supports:
- Personalized questions based on user data
- Multiple question categories
- Fallback mechanisms when AI generation fails

## Getting Started

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd skillassessment
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Set up environment variables**
   Copy `.env.local.example` to `.env.local` and fill in the required values:
   ```
   cp .env.local.example .env.local
   ```
   Essential variables:
   - `GEMINI_API_KEY` - For AI-powered question generation
   - `NEXT_PUBLIC_SUPABASE_URL` - For database access
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - For database authentication

4. **Start the development server**
   ```
   npm run dev
   ```
   Access the application at http://localhost:3000

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow functional component patterns
- Use Next.js App Router conventions
- Leverage the existing UI component system
- Run `npm run format` to format code with Prettier

### Component Structure

When creating new components:
1. Review existing components for style consistency
2. Place shared components in `src/components`
3. Place page-specific components within their page directories
4. Use Shadcn UI where possible for consistency

### State Management

- Use React hooks for local state (`useState`, `useReducer`)
- Use context where needed for shared state
- Consider server components for data-fetching logic

## Common Tasks

### 1. Adding a New Page

1. Create a new directory or file in `src/app`
2. Add the page component with appropriate metadata
3. Link to it from the navigation if needed

Example:
```tsx
// src/app/new-page/page.tsx
export const metadata = {
  title: "New Page - DebugShala",
  description: "Description of new page"
}

export default function NewPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">New Page</h1>
      {/* Content */}
    </div>
  )
}
```

### 2. Modifying the Navbar

The Navbar is located at `src/components/ui/navbar.tsx`. To add new items:
1. Import necessary icons
2. Add a new dropdown or link in the appropriate section
3. For dropdowns, follow the existing pattern with state management

### 3. Updating the Assessment System

#### Adding New Question Types:
1. Update the `QuestionType` in `src/types/assessment.ts`
2. Modify the question generation logic in `src/app/api/questions/gemini/route.ts`
3. Update the UI for displaying questions in `src/app/assessment/test/page.tsx`

#### Modifying Results Display:
1. Edit the `src/app/assessment/results/page.tsx` file
2. Update chart components as needed
3. Ensure data processing maintains the same structure

## API Integration

### Gemini AI Integration

The project uses Google's Gemini AI for generating assessment questions:

1. API requests are handled in `src/lib/gemini.ts`
2. The endpoint is exposed at `src/app/api/questions/gemini/route.ts`
3. Configuration may need adjustment based on API changes

To modify the prompt engineering:
1. Locate the relevant prompt template in `src/lib/gemini.ts`
2. Adjust the prompt while maintaining the required output format

### Supabase Integration

The application uses Supabase for authentication and data storage:

1. Client initialization is in `src/lib/supabase.ts`
2. Authentication helpers are in `src/lib/supabase-setup.ts`

## UI/UX Design System

The application uses:
- TailwindCSS for styling
- Shadcn UI components
- Framer Motion for animations
- Lucide React for icons

### Theme Customization

To modify the theme:
1. Update `tailwind.config.js` for color schemes
2. Modify Shadcn UI component definitions in `src/components/ui`

## External Services

### WhatsApp Chat Widget

The application integrates a WhatsApp chat widget on the home page:
- Script: `https://wb.bizfy.in/popup/whatsapp?id=6SKG2rp27R`
- Integration point: `src/app/page.tsx`

## Build & Deployment

### Build Process

1. **Validate the code before building**
   ```
   npm run validate
   ```
   This runs linting and type checking

2. **Create a production build**
   ```
   npm run build
   ```

3. **Test the production build locally**
   ```
   npm run start
   ```

### Deployment Options

#### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set required environment variables in the Vercel dashboard
3. Deploy the main branch
4. Configure domain settings if needed

#### Other Platforms

For other platforms like Netlify, AWS Amplify, or traditional hosting:
1. Build the application with `npm run build`
2. Deploy the `.next` directory
3. Ensure environment variables are configured correctly
4. Set up proper Node.js version (18.17.0 or higher)

### Deployment Checklist

- [x] Environment variables are set correctly
- [x] Images are properly optimized
- [x] API keys have appropriate permissions
- [x] Security headers are configured
- [x] Performance monitoring is set up

## Troubleshooting

### Common Issues

1. **Lucide Icon Errors**
   If you see errors about missing icons, ensure:
   - The icon is properly imported from `lucide-react`
   - The icon name is correct (check Lucide docs for available icons)
   - Example fix: Replace `import { FileContract } from 'lucide-react'` with an available icon like `import { FileCog } from 'lucide-react'`

2. **Next.js Build Errors**
   - Run `npm run validate` to identify issues
   - Check component props match their TypeScript interfaces
   - Verify all required dependencies are installed

3. **API Integration Issues**
   - Verify environment variables are set correctly
   - Check API rate limits and quota usage
   - Test API endpoints using tools like Postman

4. **String Escaping in Templates**
   - Be careful with apostrophes in template strings, especially in the `gemini.ts` file
   - Use double quotes for strings with apostrophes or properly escape them

## Important Notes

### Project Analysis Findings

During the project analysis, we identified and fixed several issues:

1. **Security Vulnerabilities**
   - Updated ESLint configuration to improve security scanning
   - Added proper Node.js version requirements
   - Configured proper CORS and security headers

2. **Code Quality**
   - Fixed string escaping issues in template literals
   - Added TypeScript type checking to the validation process
   - Implemented Prettier for consistent code formatting

3. **Build Process**
   - Added additional scripts for validation and analysis
   - Improved error handling in critical components
   - Enhanced Next.js configuration for better performance

4. **Dependencies**
   - Ensured all dependencies have compatible versions
   - Added missing development dependencies
   - Configured proper encoding for all files

5. **Environment Configuration**
   - Created a template for required environment variables
   - Added validation for critical environment variables
   - Improved configuration for different deployment environments

### Next Steps for Development

1. Consider upgrading to Next.js 14 for improved performance and security
2. Implement automated testing with Jest and React Testing Library
3. Add internationalization support for multiple languages
4. Enhance accessibility features to meet WCAG standards
5. Implement progressive web app (PWA) capabilities

## Contact

For further assistance, contact the senior development team at support@debugshala.com 