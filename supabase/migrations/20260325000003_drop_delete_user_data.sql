-- drop the delete_user_data function, no longer needed now that sets cascade on workout delete
DROP FUNCTION IF EXISTS delete_user_data(UUID);
