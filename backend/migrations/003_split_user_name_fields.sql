ALTER TABLE users ADD COLUMN title VARCHAR(20);
ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN middle_name VARCHAR(255);
ALTER TABLE users ADD COLUMN last_name VARCHAR(255);

UPDATE users SET
  first_name = split_part(name, ' ', 1),
  last_name = split_part(name, ' ', array_length(string_to_array(name, ' '), 1))
WHERE first_name IS NULL;

ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE users DROP COLUMN name;
