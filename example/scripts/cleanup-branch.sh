ENV_ID=${BRANCH_NAME//\//_} # Replace / with _

case $BRANCH_NAME in
  main|master|develop|test) echo "Refusing to clean up after this branch"; exit 1;;
esac

echo "DELETE https://api.contentful.com/spaces/****/environments/$ENV_ID"

curl --include \
     --request DELETE \
     --header "Authorization: Bearer $CONTENTFUL_ACCESS_TOKEN" \
     "https://api.contentful.com/spaces/$CONTENTFUL_SPACE_ID/environments/$ENV_ID"
