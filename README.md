# Cyborg Habit Frontend

A Netflix-style habit tracking application built with React, Vite, Tailwind CSS v4, and Supabase.

## Features

- 🎬 Netflix-style horizontal scrolling interface
- 📱 Responsive design with modern UI
- 📝 Challenge tracking with postcard-style cards
- 💭 Daily reflection system
- 📊 Progress tracking
- 🗄️ Supabase backend integration
- 💡 Intended "aha moments" display

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM
- **Backend**: Supabase
- **Storage**: LocalStorage (for user progress)
- **Deployment**: Ready for Vercel/Netlify

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cyborg-habit-frontend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Setup

Create the challenges table in your Supabase database using the provided schema:

#### `challenges` table
```sql
-- Create the challenges table from scratch
CREATE TABLE challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Core challenge data
    challenge_1 TEXT NOT NULL,
    challenge_1_type TEXT,
    challenge_2 TEXT NOT NULL,
    challenge_2_type TEXT,
    reflection_question TEXT NOT NULL,
    intended_aha_moments TEXT[] NOT NULL,
    
    -- Optional metadata
    title VARCHAR(255),
    order_index INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX idx_challenges_order ON challenges(order_index);
CREATE INDEX idx_challenges_type1 ON challenges(challenge_1_type);
CREATE INDEX idx_challenges_type2 ON challenges(challenge_2_type);

-- Enable Row Level Security
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public read access
CREATE POLICY "Anyone can view challenges" ON challenges
    FOR SELECT USING (true);
```

### 4. Insert Challenge Data

Use the provided SQL insert statements to populate your challenges table with all 15 days of content.

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:5173` to see your application.

## Project Structure

```
src/
├── components/
│   ├── ChallengeCard.jsx    # Postcard-style challenge cards
│   ├── DayTile.jsx          # Netflix-style day tiles
│   └── ReflectionSection.jsx # Daily reflection component
├── pages/
│   ├── HomePage.jsx         # Main dashboard with day tiles
│   └── DayPage.jsx          # Individual day view
├── lib/
│   └── supabase.js          # Supabase client configuration
├── App.jsx                  # Main app component with routing
└── main.jsx                 # App entry point
```

## Key Features Explained

### Netflix-Style Interface
- Horizontal scrolling day tiles
- Hover effects and smooth transitions
- Progress indicators and completion badges

### Challenge System
- Two challenges per day with different types (Explain It, Improve It, etc.)
- Postcard-style cards with images
- Toggle completion status
- Progress tracking in localStorage

### Reflection System
- Unlocks after completing both daily challenges
- Rich text input with validation
- Edit capability for submitted reflections
- Automatic day completion marking

### Intended Aha Moments
- Each day shows potential insights users might discover
- Helps set expectations and guide thinking
- Beautiful purple gradient display

## Data Storage

The app uses a hybrid approach:
- **Challenge content**: Stored in Supabase `challenges` table
- **User progress**: Stored in browser localStorage
- **Reflections**: Stored in browser localStorage

This allows the app to work immediately without complex user authentication while still pulling dynamic content from Supabase.

## Challenge Types

The app supports various challenge types:
- **Explain It**: Communication and clarity challenges
- **Improve It**: Enhancement and optimization tasks
- **Imagine It**: Creative and strategic thinking
- **Critique It**: Analysis and evaluation exercises
- **Plan It**: Organization and planning tasks
- **Guide It**: Step-by-step guidance challenges
- **Suggest It**: Recommendation and advice tasks

## Customization

### Styling
The app uses Tailwind CSS v4. Customize the design by modifying the utility classes in the components.

### Content
Update the challenge data in Supabase to customize:
- Challenge descriptions and types
- Reflection questions
- Intended aha moments
- Day titles and ordering

### Branding
- Update the app title in `HomePage.jsx`
- Modify color schemes in Tailwind classes
- Add your logo and branding elements

## Deployment

### Vercel
```bash
npm run build
# Deploy the dist/ folder to Vercel
```

### Netlify
```bash
npm run build
# Deploy the dist/ folder to Netlify
```

## Environment Variables for Production

Make sure to set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Future Enhancements

Potential improvements you could add:
- User authentication and cloud storage of progress
- Social sharing of reflections
- Progress analytics and insights
- Custom challenge creation
- Team/group challenges
- Export functionality for reflections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own habit tracking applications!

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify your Supabase configuration
3. Ensure all environment variables are set correctly
4. Check that your Supabase table matches the schema above
5. Verify your challenge data is properly inserted
