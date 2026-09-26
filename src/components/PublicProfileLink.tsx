import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface PublicProfileLinkProps {
  userId: string;
  className?: string;
  children: ReactNode;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PublicProfileLink = ({ userId, className, children }: PublicProfileLinkProps) =>
  UUID_PATTERN.test(userId)
    ? <Link to={`/users/${userId}`} className={className}>{children}</Link>
    : <span className={className}>{children}</span>;

export default PublicProfileLink;