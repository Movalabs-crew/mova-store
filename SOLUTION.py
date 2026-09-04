import os
import sys

# Configuration: The specific list of jobs required by the upstream workflow 'needs' section.
# This list defines the scope for the summary gate logic.
# Updated to include 'rust_security' to match the 4-job acceptance criteria.
needed_jobs = [
    "frontend",
    "contracts",
    "rust_security",
    "security"
]

def main():
    """
    Iterates through every job declared in the 'needs' list.
    Checks the environment result for each to ensure the summary gate is accurate.
    """
    for job_name in needed_jobs:
        # Constructs the string key corresponding to the workflow's result variable
        # e.g., 'needs_frontend_result'
        result_key = f"needs_{job_name}_result"
        
        # Retrieve the result, defaulting to 'success' if the env var is missing
        # This handles cases where jobs haven't run yet or were forced to fail
        result_status = os.environ.get(result_key, "success")

        # Explicit failure branch for each needed job
        if result_status != "success":
            print(f"{job_name} job gate failed with result: {result_status}")
            # Force exit code 1 to signal gate failure to the parent pipeline
            sys.exit(1)

    # If the loop finishes without exiting, every needed job reported 'success'
    print("All required checks passed!")
    sys.exit(0)

if __name__ == "__main__":
    main()