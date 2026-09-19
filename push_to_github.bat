@echo off
echo Pushing to GitHub...
cd "c:\Users\عبدالله العزكي\Desktop\pdf\مجلد جديد\hasebo"
git init
git add .
git commit -m "Add GitHub Actions workflow"
git remote add origin https://github.com/mmohannad627-cpu/hasebo-pos.git
git branch -M main
git push -u origin main
echo Done!
pause
