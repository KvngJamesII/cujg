import { useAuth } from "@/contexts/AuthContext";
import { Route, Redirect } from "wouter";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  path,
  component: Component,
  adminOnly = false,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[--bg-primary]">
        <Spinner className="h-8 w-8 text-[--accent-primary]" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Redirect to="/dashboard" />;
  }

  return <Route path={path} component={Component} />;
};
