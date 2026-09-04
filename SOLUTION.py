from pathlib import Path
import re
from typing import List

def main(README_FILE: str = "README.md"):
    """
    Reads README.md, identifies the Environment section, and injects the 4 missing
    EmailJS variable rows to satisfy the Bounty requirements.
    """
    content = Path(README_FILE).read_text(encoding="utf-8")
    
    # The 4 specific variables from .env.local.example
    vars_to_inject: List[str] = [
        "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
        "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
        "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
        "NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL"
    ]
    
    # Regex to find the 'Environment' header block
    # Matches header, multi-line body, then next header or EOF
    section_regex = r'(## \w+?Environment\n)(.*?)(\n## \w+\n|\Z)'
    
    def insert_rows(match: re.Match) -> str:
        prefix, body, suffix = match.groups()
        
        # Build the 4 rows for the EmailJS variables
        row_block = ""
        for var in vars_to_inject:
            # Row structure: | VAR_NAME | Description | Type |
            row_block += f"\n| {var} | {var} | EmailJS |"
            
        return prefix + row_block + suffix
    
    # Apply substitution (DOTALL allows body to span newlines correctly)
    updated_content = re.sub(section_regex, insert_rows, content, flags=re.DOTALL)
    
    # Write back to disk
    Path(README_FILE).write_text(updated_content, encoding="utf-8")
    
    return updated_content

if __name__ == "__main__":
    main()