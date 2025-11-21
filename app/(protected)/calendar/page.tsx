"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Plus,
} from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
};

export default function CalendarPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [uid, setUid] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loc, setLoc] = useState("");

  const load = useCallback(
    async (userId: string) => {
      const { data, error } = await sb
        .from("calendar_events")
        .select("id,title,starts_at,ends_at,location")
        .eq("user_id", userId)
        .order("starts_at", { ascending: true });
      if (error) console.error(error);
      setEvents(data || []);
    },
    [sb]
  );

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getUser();
      if (!data?.user) return;
      setUid(data.user.id);
      await load(data.user.id);
    })();
  }, [sb, load]);

  async function addEvent() {
    if (!uid || !title || !start) {
      alert("Please enter at least a title and start time");
      return;
    }
    const { error } = await sb.from("calendar_events").insert({
      user_id: uid,
      title,
      starts_at: new Date(start).toISOString(),
      ends_at: end ? new Date(end).toISOString() : null,
      location: loc || null,
    });
    if (error) {
      alert("Failed to add event: " + error.message);
      return;
    }
    setTitle("");
    setStart("");
    setEnd("");
    setLoc("");
    await load(uid);
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage document deadlines and review meetings
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => {
                const eventDate = new Date(e.starts_at);
                const today = new Date();
                return (
                  eventDate.getDate() === today.getDate() &&
                  eventDate.getMonth() === today.getMonth() &&
                  eventDate.getFullYear() === today.getFullYear()
                );
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => new Date(e.starts_at) > new Date()).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Future events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Past Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => new Date(e.starts_at) < new Date()).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Event</CardTitle>
          <CardDescription>
            Create a new calendar event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <Input
                placeholder="Event title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location (optional)</label>
              <Input
                placeholder="Location..."
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Time (optional)</label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={addEvent} disabled={!title || !start}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            Your calendar events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No events yet
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{new Date(ev.starts_at).toLocaleString()}</div>
                          {ev.ends_at && (
                            <div className="text-xs text-muted-foreground">
                              → {new Date(ev.ends_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{ev.title}</TableCell>
                    <TableCell className="text-muted-foreground">{ev.location || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
