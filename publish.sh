rm index.zip 
cd apps/scribe 
zip -r ../index.zip *
cd .. 
aws lambda update-function-code --function-name AlexaScribeSkill --zip-file fileb://index.zip