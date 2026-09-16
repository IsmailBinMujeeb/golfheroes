import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-content px-5 py-28">
      <h1 className="font-display text-lead font-semibold">Nothing lives at this address</h1>
      <p className="mt-3 max-w-md text-cream-300">
        The link may be old or mistyped. The homepage and the charity directory are both a click away.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/">Back to the homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/charities">Browse charities</Link>
        </Button>
      </div>
    </div>
  );
}
