import subprocess
from pathlib import Path

def cleanup_dsg_store():
    """
    Removes tracked .DS_Store files from the repository by syncing
    the Git index with the working directory and committing the change.
    """
    repo_root = Path(".").resolve()

    # Find all .DS_Store files present on disk within the repo
    # Using rglob handles nested directories automatically
    ds_store_files = list(repo_root.rglob(".DS_Store"))

    for file_path in ds_store_files:
        # Convert to posix path to ensure git handles paths consistently
        # especially across OS environments (e.g., Windows backslashes)
        relative_path = file_path.as_posix()

        # 1. Remove from Git's index (cached)
        # This prepares the index to match the file state
        subprocess.run(
            ["git", "rm", "--cached", relative_path],
            cwd=repo_root,
            check=True,
            capture_output=True
        )

        # 2. Delete from disk to finalize the working tree state
        # git rm --cached above updates the index; unlink updates the file
        if file_path.exists():
            file_path.unlink()

    # 3. Commit the changes to make git status clean
    # Using 'add' implicitly via rm --cached or commit directly
    subprocess.run(
        ["git", "commit", "-m", "fix(dsg_store): sync tracked files"],
        cwd=repo_root,
        check=True,
        capture_output=True
    )

if __name__ == "__main__":
    cleanup_dsg_store()