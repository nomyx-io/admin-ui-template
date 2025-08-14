#!/bin/bash

# Update all files to import Link from next/link and replace to= with href=
for file in $(find src/components -name "*.jsx" -o -name "*.tsx"); do
  # Check if file uses Link from react-router-dom
  if grep -q "Link.*from.*useNextRouter" "$file"; then
    # Replace the import
    sed -i '' 's/import.*{.*Link.*}.*from.*"..\/hooks\/useNextRouter"/import Link from "next\/link"; import { useNavigate, useParams, useLocation } from "..\/hooks\/useNextRouter"/g' "$file"
  fi
  
  # Replace to= with href= in Link components
  sed -i '' 's/<Link to=/<Link href=/g' "$file"
done

echo "Updated Link components to use Next.js"