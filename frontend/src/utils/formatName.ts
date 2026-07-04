interface NameParts {
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
}

export function formatFullName(person: NameParts): string {
  return [person.title, person.first_name, person.middle_name, person.last_name]
    .filter(Boolean)
    .join(" ");
}

export function getInitials(person: NameParts): string {
  return (person.first_name[0] + person.last_name[0]).toUpperCase();
}
