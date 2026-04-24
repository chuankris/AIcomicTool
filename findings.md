# JSON Storage Findings

## Current Candidates

- `projects.shots`: stores the whole Step 2 storyboard list, including index, scene, dialogue, prompt override, references, resolution and safety settings. This is now primary workflow state and should move to a `shots` table.
- `characters.form_prompts`: currently JSON, but shape is fixed by `CharacterForm`; good candidate for explicit columns.
- `characters.attributes`: flexible AI-extracted profile/background attributes. Keep JSON for now because fields are semi-structured and still evolving.
- `projects.model_config`: model connection snapshot. It is JSON, but is not currently queried or edited per field inside project workflows. Keep for this pass unless we redesign settings/project config together.
- `Shot.characterRefs/backgroundRef`: if `shots` becomes a table, references should become columns or a link table. First version can store primary character refs in `shot_character_refs` and background in shot columns.
- `Shot.resolution/safeArea`: fixed structure; if `shots` becomes a table, promote to columns.

## Final Decisions

- Promoted storyboard state from `projects.shots` JSON into:
  - `storyboard_shots`
  - `shot_character_refs`
  - `shot_character_names`
- Removed the legacy `projects.shots` column after structured storyboard tables were verified.
- Promoted fixed character form prompts from `characters.form_prompts` JSON into explicit columns:
  - `human_form_prompt`
  - `animal_form_prompt`
  - `transforming_form_prompt`
- Kept `characters.attributes` as JSON because it remains AI-extracted, flexible, and not queried independently yet.
- Kept `projects.model_config` as JSON for this pass because it behaves as a project-level model snapshot, not storyboard workflow state.

## Legacy Cleanup

- Dropped `projects.shots`; storyboard state now lives only in structured shot tables.
- Dropped `characters.form_prompts`; fixed form prompts now live only in explicit form prompt columns.
