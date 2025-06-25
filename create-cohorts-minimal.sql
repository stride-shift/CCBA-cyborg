-- Ultra-minimal cohorts table creation
-- Start with just the basics to avoid any conflicts

-- Step 1: Create basic cohorts table with minimal columns
CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Insert minimal test data
INSERT INTO cohorts (name, description, start_date, end_date, status) VALUES 
('Test Cohort 1', 'First test cohort', '2024-03-01', '2024-05-31', 'active'),
('Test Cohort 2', 'Second test cohort', '2024-06-01', '2024-08-31', 'draft');

-- Step 3: Test basic functionality
SELECT 'Basic cohorts table created successfully!' as status;
SELECT * FROM cohorts; 