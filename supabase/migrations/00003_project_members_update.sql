-- Add UPDATE policy for project_members (was missing from initial migration)
-- Only project admins or workspace admins can update member roles
CREATE POLICY "project_members_update" ON project_members
  FOR UPDATE
  USING (
    is_project_member(project_id, auth.uid())
  )
  WITH CHECK (
    -- Only project admins or workspace admins can change roles
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
    OR is_workspace_admin(auth.uid())
  );
