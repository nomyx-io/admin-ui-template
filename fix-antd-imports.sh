#!/bin/bash

# Fix antd imports that commonly have issues in antd 5.x

echo "Fixing antd imports in Admin Portal..."

# Components that need direct imports
COMPONENTS_TO_FIX="Modal Select Transfer Tooltip DatePicker TimePicker AutoComplete Cascader TreeSelect Upload"

for component in $COMPONENTS_TO_FIX; do
    echo "Fixing $component imports..."
    
    # Find files with this component import from antd
    files=$(grep -r "import.*{.*$component.*}.*from ['\"]antd['\"]" src/ --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts" -l)
    
    for file in $files; do
        echo "  Processing $file"
        
        # Check if component is already directly imported
        if grep -q "import $component from ['\"]antd/es/" "$file"; then
            echo "    Already has direct import for $component"
        else
            # Extract the import line
            import_line=$(grep "import.*{.*$component.*}.*from ['\"]antd['\"]" "$file")
            
            # Remove the component from the destructured import
            new_import_line=$(echo "$import_line" | sed "s/$component, //g" | sed "s/, $component//g" | sed "s/{$component}/{ }/g" | sed "s/{ $component }/{ }/g")
            
            # If the import becomes empty, comment it out
            if echo "$new_import_line" | grep -q "{ }"; then
                new_import_line="// $new_import_line"
            fi
            
            # Add the direct import after the modified line
            component_lower=$(echo "$component" | tr '[:upper:]' '[:lower:]')
            direct_import="import $component from \"antd/es/$component_lower\";"
            
            # Create a temporary file with the fix
            awk -v orig="$import_line" -v new="$new_import_line" -v direct="$direct_import" '
                $0 == orig {
                    print new
                    print direct
                    next
                }
                { print }
            ' "$file" > "$file.tmp"
            
            # Move the temp file back
            mv "$file.tmp" "$file"
        fi
    done
done

echo "Antd import fixes complete!"