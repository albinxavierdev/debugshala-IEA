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
- [Troubleshooting](#troubleshooting)

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: TailwindCSS
- **UI Components**: Shadcn UI
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI Integration**: Google Gemini API
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
   Create a `.env.local` file with:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```

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

## Troubleshooting

### Common Issues

1. **Lucide Icon Errors**
   If you see errors about missing icons, ensure:
   - The icon is properly imported from `lucide-react`
   - The icon name is correct (check Lucide docs for available icons)
   - Example fix: Replace `import { FileContract } from 'lucide-react'` with an available icon like `import { FileCog } from 'lucide-react'`

2. **Next.js Build Errors**
   - Run `npm run lint` to identify issues
   - Check component props match their TypeScript interfaces
   - Verify all required dependencies are installed

3. **API Integration Issues**
   - Verify environment variables are set correctly
   - Check API rate limits and quota usage
   - Test API endpoints using tools like Postman

## Deployment

The application can be deployed to Vercel:
1. Connect your GitHub repository to Vercel
2. Set required environment variables
3. Deploy the main branch

## Contact

For further assistance, contact the senior development team at support@debugshala.com 