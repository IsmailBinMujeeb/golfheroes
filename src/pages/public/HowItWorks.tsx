import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-content px-5 py-16">
      <h1 className="max-w-2xl font-display text-lead font-semibold">
        What the draw actually does with your scores
      </h1>

      <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,60ch),1fr]">
        <div className="space-y-8 text-cream-300">
          <Section title="Your scores are your ticket">
            <p>
              Stableford scores run from 1 to 45, and so do the draw numbers. The five scores you have
              stored are the five numbers you play. Log a sixth score and it replaces the oldest one, which
              means your ticket changes as your form does. If two of your scores are identical, the second
              one is nudged to the next free number so you always hold five distinct numbers.
            </p>
          </Section>

          <Section title="Two ways the numbers come out">
            <p>
              A random draw is a standard lottery pull: five numbers from forty-five, every number equally
              likely. An algorithmic draw weights each number by how often it appears across everyone's
              entries that month, so the numbers the field is actually playing come up more often. The admin
              picks which type runs, and the choice is published with the result.
            </p>
          </Section>

          <Section title="How the money splits">
            <p>
              A fixed share of every subscription goes into the month's pool. Forty percent of it sits with
              the five-number match, thirty-five with four, twenty-five with three. Everyone who matches at
              the same tier splits that tier equally. If nobody matches five, that portion carries into next
              month's jackpot.
            </p>
          </Section>

          <Section title="Before anyone is paid">
            <p>
              Winners upload a screenshot of the scores from their golf platform. An admin checks it against
              what was logged here and either approves the payout or sends it back with a reason. Payouts
              move from pending to paid once the transfer clears.
            </p>
          </Section>

          <Section title="Where the charity money goes">
            <p>
              You choose a charity when you subscribe and set the percentage of your fee that goes to it.
              Ten percent is the minimum and you can raise it at any time. Donations made outside the
              subscription go straight to the charity and have no effect on the draw.
            </p>
          </Section>
        </div>

        <aside className="h-fit border border-line-700 bg-ink-800 p-6">
          <p className="font-display text-lg">Ready to play?</p>
          <p className="mt-2 text-sm text-cream-300">
            Pick a plan, pick a cause, log your first score. The next draw closes at the end of the month.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/subscribe">Subscribe now</Link>
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/charities">Browse charities first</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-cream-100">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
