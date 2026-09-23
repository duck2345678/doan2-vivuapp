-- Add SYSTEM to message type check constraint
-- This migration adds the SYSTEM message type for system notifications (e.g., "X added Y to group")

-- First, drop the existing constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;

-- Recreate the constraint with SYSTEM included
ALTER TABLE messages ADD CONSTRAINT messages_type_check 
    CHECK (type IN ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'SHARED_POST', 'SYSTEM'));
