-- Drop remaining broken unused function (signature was text[], text[])
DROP FUNCTION IF EXISTS get_cascaded_filter_options(text[], text[]);
