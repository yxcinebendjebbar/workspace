-- The Daily view filters issues on status across every project, so it needs a
-- plain status index; issues_project_status starts with the project id.
CREATE INDEX issues_status ON issues (status);
