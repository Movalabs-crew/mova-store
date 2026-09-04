import re
from pathlib import Path

def fix_readme():
    """
    Fixes the duplicated sentence in README.md around line 270 (1-indexed).
    Replaces the truncated fragment and the duplicated line with one coherent sentence.
    """
    file_path = Path("README.md")

    if file_path.exists():
        content = file_path.read_text(encoding="utf-8")
        lines = content.splitlines()

        # The duplication is specifically identified in the issue around 1-indexed line 270.
        # We target index 269 (0-indexed).
        target_idx = 269

        # Ensure we are within bounds (handling empty lines or short files)
        if target_idx < len(lines):
            current_line = lines[target_idx]
            
            # Define the coherent sentence that should replace the 'two broken lines'
            # The 'fill Supabase...' line is the robust content piece.
            unified_line = "  A minimal Stellar-only configuration (fill Supabase values for auth/catalog):"

            # If the current line matches the specific fragment described, replace it.
            # This handles the 'concatenated halves' by prioritizing the descriptive 'fill...' line.
            fragment_marker = "A minimal Stellar-only configuration"

            if fragment_marker in current_line:
                # Replace the block at target_idx
                # If there is a next line (271/idx 270), merge it or swap.
                # To ensure 'grep' returns exactly one line, we consolidate the text.
                lines[target_idx] = unified_line
                
                # If there was a second line with the same text (the 'duplicated' part),
                # append its specific content to the first line to make it complete.
                # Or, if the 'fill' line is the anchor, keep that.
                if len(lines) > target_idx + 1:
                    next_line = lines[target_idx + 1]
                    # If next line starts with the same phrase, append or replace
                    if next_line.startswith(fragment_marker):
                         lines[target_idx + 1] = f"{next_line.split('(')[1]}" # Append remaining content
                         lines[target_idx] = f"{lines[target_idx]} {lines[target_idx + 1]}" 
                    
            # Join lines back together
            # Handle potential empty string at the end
            final_content = "\n".join(lines)
            
            # Write back to file
            file_path.write_text(final_content, encoding="utf-8")

    if __name__ == "__main__":
        fix_readme()