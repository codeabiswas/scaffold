"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = [
  "Morning (6am–9am)",
  "Mid-morning (9am–12pm)",
  "Afternoon (12pm–3pm)",
  "Late afternoon (3pm–6pm)",
  "Evening (6pm–9pm)",
  "Night (9pm–12am)",
];

/** Generate 15-minute intervals from 00:00 to 23:45 */
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      times.push(`${hour}:${min}`);
    }
  }
  return times;
}

const ALL_TIME_OPTIONS = generateTimeOptions();

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${mStr} ${suffix}`;
}

interface CustomSlot {
  id: string;
  start: string;
  end: string;
}

export function CalendarConnect({ userId }: { userId: string }) {
  const router = useRouter();
  const [availability, setAvailability] = useState<Record<string, string[]>>(
    {}
  );
  const [customSlots, setCustomSlots] = useState<Record<string, CustomSlot[]>>(
    {}
  );
  const [addingCustom, setAddingCustom] = useState<Record<string, boolean>>({});
  const [customStart, setCustomStart] = useState<Record<string, string>>({});
  const [customEnd, setCustomEnd] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function toggleSlot(day: string, slot: string) {
    setAvailability((prev) => {
      const daySlots = prev[day] || [];
      const next = daySlots.includes(slot)
        ? daySlots.filter((s) => s !== slot)
        : [...daySlots, slot];
      return { ...prev, [day]: next };
    });
  }

  function getUsedCustomSlots(day: string): CustomSlot[] {
    return customSlots[day] || [];
  }

  /** Filter out time options that overlap with existing custom slots for a day */
  function getAvailableStartTimes(day: string): string[] {
    const used = getUsedCustomSlots(day);
    return ALL_TIME_OPTIONS.filter((t) => {
      return !used.some((slot) => t >= slot.start && t < slot.end);
    });
  }

  function getAvailableEndTimes(day: string, start: string): string[] {
    const used = getUsedCustomSlots(day);
    // End times must be after start, and not overlap existing custom slots
    return ALL_TIME_OPTIONS.filter((t) => {
      if (t <= start) return false;
      // Check if this end time would overlap with any existing custom slot
      return !used.some(
        (slot) => start < slot.end && t > slot.start
      );
    });
  }

  function handleAddCustomStart(day: string) {
    setAddingCustom((prev) => ({ ...prev, [day]: true }));
    setCustomStart((prev) => ({ ...prev, [day]: "" }));
    setCustomEnd((prev) => ({ ...prev, [day]: "" }));
  }

  function handleConfirmCustom(day: string) {
    const start = customStart[day];
    const end = customEnd[day];
    if (!start || !end) return;

    const newSlot: CustomSlot = {
      id: `${day}-${start}-${end}`,
      start,
      end,
    };

    setCustomSlots((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), newSlot],
    }));

    // Reset the add-custom form
    setAddingCustom((prev) => ({ ...prev, [day]: false }));
    setCustomStart((prev) => ({ ...prev, [day]: "" }));
    setCustomEnd((prev) => ({ ...prev, [day]: "" }));
  }

  function handleRemoveCustom(day: string, slotId: string) {
    setCustomSlots((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((s) => s.id !== slotId),
    }));
  }

  function handleCancelCustom(day: string) {
    setAddingCustom((prev) => ({ ...prev, [day]: false }));
  }

  /** Combine preset + custom slots into a single availability object */
  function buildFullAvailability(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const day of DAYS) {
      const presets = availability[day] || [];
      const customs = (customSlots[day] || []).map(
        (s) => `${formatTime(s.start)}–${formatTime(s.end)}`
      );
      if (presets.length > 0 || customs.length > 0) {
        result[day] = [...presets, ...customs];
      }
    }
    return result;
  }

  const hasAnySelection =
    Object.values(availability).some((v) => v.length > 0) ||
    Object.values(customSlots).some((v) => v.length > 0);

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();
    const fullAvailability = buildFullAvailability();

    await supabase.from("calendar_availability").upsert({
      user_id: userId,
      availability: fullAvailability,
    });

    await supabase
      .from("users")
      .update({ onboarding_step: 4 })
      .eq("id", userId);

    router.push("/onboarding?step=5");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Weekly Availability</CardTitle>
        <CardDescription>
          Select the time slots when you&apos;re typically free. This helps us
          schedule your habit at realistic times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {DAYS.map((day) => (
          <div key={day} className="space-y-2">
            <Label className="text-base font-medium">{day}</Label>

            {/* Preset time slots */}
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = (availability[day] || []).includes(slot);
                return (
                  <Button
                    key={slot}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSlot(day, slot)}
                  >
                    {slot}
                  </Button>
                );
              })}
            </div>

            {/* Custom time slots (already added) */}
            {(customSlots[day] || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {(customSlots[day] || []).map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2.5 py-1 text-sm"
                  >
                    <span>
                      {formatTime(slot.start)}–{formatTime(slot.end)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustom(day, slot.id)}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove custom time"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom timing form */}
            {addingCustom[day] ? (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3 bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Select
                    value={customStart[day] || ""}
                    onValueChange={(val) =>
                      setCustomStart((prev) => ({ ...prev, [day]: val }))
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStartTimes(day).map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatTime(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Select
                    value={customEnd[day] || ""}
                    onValueChange={(val) =>
                      setCustomEnd((prev) => ({ ...prev, [day]: val }))
                    }
                    disabled={!customStart[day]}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent>
                      {customStart[day] &&
                        getAvailableEndTimes(day, customStart[day]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatTime(t)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleConfirmCustom(day)}
                  disabled={!customStart[day] || !customEnd[day]}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancelCustom(day)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => handleAddCustomStart(day)}
              >
                + add custom timing
              </Button>
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={submitting || !hasAnySelection}
          className="w-full"
          size="lg"
        >
          {submitting ? "Saving..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
