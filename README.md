# Life Coach AI

An intelligent assistant that unifies task management across platforms (Gmail, Google Calendar, Notion), automatically prioritizes activities based on context and goals, and learns from user behavior to provide increasingly personalized and proactive assistance.

## Features

- **Unified Task Management**: Integrate with Gmail, Google Calendar, and Notion
- **Intelligent Prioritization**: Automatic task organization based on multiple factors
- **Context Awareness**: Interface and recommendations that adapt to your current focus
- **Goal Alignment**: Connect daily activities to long-term objectives
- **Personalized Learning**: System improves based on your behavior and feedback

## Getting Started

### Prerequisites

- Node.js 16+
- Supabase account
- OpenAI API key
- Google OAuth credentials
- Notion API key (optional)

### Installation

1. Clone the repository
   ```
   git clone https://your-repository-url/life-coach-ai.git
   cd life-coach-ai
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your API keys and credentials

4. Run the development server
   ```
   npm run dev
   ```

## Database Setup

The application uses Supabase as its backend database. To set up the necessary tables and security policies, follow these steps:

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Get your Supabase URL and anon key from the API settings
3. Update the `.env.local` file with your Supabase credentials
4. Run the database setup SQL in the Supabase SQL editor:
   - Open your Supabase project dashboard
   - Go to "SQL Editor"
   - Create a "New Query"
   - Paste the contents of `supabase/schema.sql` in the editor
   - Click "Run" to execute the SQL script

### Database Schema

The schema includes tables for:
- Tasks
- Goals
- User context tracking
- Integration credentials
- User preferences
- Vector embeddings for AI learning

## Project Structure

The project follows the Model-Controller-Provider (MCP) architecture:

### Models
- `Task`: Represents individual tasks with their properties and operations
- `Goal`: Manages goal-related data and progress calculation
- `UserContext`: Tracks the user's current context (focus, energy, available time)

### Controllers
- `TaskController`: Handles CRUD operations for tasks
- `GoalController`: Manages goal creation, updates, and task associations
- `UserContextController`: Updates and retrieves the user's context

### Providers
- `TaskProvider`: React context for task state management
- `GoalProvider`: React context for goal state management
- `UserContextProvider`: React context for user context state

### UI Components
- Dashboard showing task priorities and insights
- Task management interface with filtering and sorting
- Goal tracking with progress visualization
- Context-aware recommendations
- Integration management for external services

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up Supabase project with schema
- Implement authentication with Google OAuth
- Create basic task management UI
- Implement Gmail integration for email processing

### Phase 2: Core Functionality (Weeks 3-4)
- Add Google Calendar integration
- Implement prioritization algorithms
- Create basic learning system
- Develop dashboard view

### Phase 3: Advanced Features (Weeks 5-6)
- Add Notion integration
- Implement proactive suggestion system
- Build goal management
- Create adaptive interface components

### Phase 4: Refinement (Weeks 7-8)
- Implement advanced learning algorithms
- Enhance personalization
- Add comprehensive reporting
- Optimize performance and UX

## Technologies

- React
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- OpenAI API
- Vite