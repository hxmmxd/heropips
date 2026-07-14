import sys

def find_unshared_lines(file1_path, file2_path, file3_path):
    try:
        # Read lines from all three files (stripping leading/trailing whitespaces/newlines)
        with open(file1_path, 'r', encoding='utf-8') as f1:
            lines1 = set(line.strip() for line in f1)
            
        with open(file2_path, 'r', encoding='utf-8') as f2:
            lines2 = set(line.strip() for line in f2)
            
        with open(file3_path, 'r', encoding='utf-8') as f3:
            lines3 = set(line.strip() for line in f3)
            
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    # Union of all lines across the three files
    all_lines = lines1.union(lines2).union(lines3)
    
    # Intersection: Lines shared by ALL three files
    shared_by_all = lines1.intersection(lines2).intersection(lines3)
    
    # Lines not shared by all three files (i.e. present in some but not all)
    not_shared_by_all = all_lines - shared_by_all
    
    print(f"Lines not shared by all three files ({len(not_shared_by_all)} total):")
    for line in sorted(not_shared_by_all):
        presence = []
        if line in lines1:
            presence.append("file1")
        if line in lines2:
            presence.append("file2")
        if line in lines3:
            presence.append("file3")
        print(f"[{', '.join(presence)}]: {line}")

if __name__ == "__main__":
    if len(sys.argv) == 4:
        find_unshared_lines(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python find_unshared_lines.py <file1> <file2> <file3>")
        print("Running with default 'file1.txt', 'file2.txt', 'file3.txt'...")
        find_unshared_lines('file1.txt', 'file2.txt', 'file3.txt')
