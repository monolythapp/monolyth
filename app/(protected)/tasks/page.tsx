"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckSquare,
  Plus,
  Calendar,
  User,
  FileText,
  Filter,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  status: "open" | "done" | "archived";
  due_at: string | null;
};

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
};

export default function TasksPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [uid, setUid] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const load = useCallback(
    async (userId: string) => {
      const { data, error } = await sb
        .from("tasks")
        .select("id,title,status,due_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setTasks(data || []);
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

  async function addTask() {
    if (!uid || !title.trim()) return;
    const dueAt = due ? new Date(due).toISOString() : null;
    const { error } = await sb.from("tasks").insert({
      user_id: uid,
      title: title.trim(),
      due_at: dueAt,
    });
    if (error) return alert("Failed to add: " + error.message);
    setTitle("");
    setDue("");
    await load(uid);
  }

  async function toggleDone(t: Task) {
    if (!uid) return;
    const next = t.status === "done" ? "open" : "done";
    const { error } = await sb.from("tasks").update({ status: next }).eq("id", t.id);
    if (error) return alert("Failed: " + error.message);
    await load(uid);
  }

  const todoTasks = tasks.filter((t) => t.status === "open");
  const completedTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage document-related tasks and to-dos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todoTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Finished tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter((t) => {
                if (!t.due_at || t.status === "done") return false;
                return new Date(t.due_at) < new Date();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
          <CardDescription>
            Create a new task
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title</label>
              <Input
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date (optional)</label>
              <Input
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={addTask} disabled={!title.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>
                {todoTasks.length} active tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks yet
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-4 p-4 border rounded-lg transition-colors",
                        task.status === "done" && "opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={task.status === "done"}
                        onCheckedChange={() => toggleDone(task)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <h3
                            className={cn(
                              "font-medium",
                              task.status === "done" && "line-through text-muted-foreground"
                            )}
                          >
                            {task.title}
                          </h3>
                          <Badge variant="secondary" className="capitalize">
                            {task.status}
                          </Badge>
                        </div>
                        {task.due_at && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.due_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>To Do</CardTitle>
              <CardDescription>
                Tasks that need to be completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todoTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending tasks
                  </div>
                ) : (
                  todoTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleDone(task)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <h3 className="font-medium">{task.title}</h3>
                        {task.due_at && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.due_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
              <CardDescription>
                {completedTasks.length} completed tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed tasks
                  </div>
                ) : (
                  completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-4 p-4 border rounded-lg opacity-50"
                    >
                      <Checkbox checked={true} disabled className="mt-1" />
                      <div className="flex-1">
                        <h3 className="font-medium line-through text-muted-foreground">
                          {task.title}
                        </h3>
                        {task.due_at && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span>Completed {new Date(task.due_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
