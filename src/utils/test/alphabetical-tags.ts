interface Tag {
  Key: string;
  Value: unknown;
}

export function alphabeticalTags(tags: Tag[]): Tag[] {
  return [...tags].sort((first, second) => {
    if (first.Key.toLowerCase() < second.Key.toLowerCase()) {
      return -1;
    }
    if (first.Key.toLowerCase() > second.Key.toLowerCase()) {
      return 1;
    }
    return 0;
  });
}
