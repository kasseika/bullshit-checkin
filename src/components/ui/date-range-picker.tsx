/**
 * DateRangePickerコンポーネント - 日付範囲選択UI
 */
'use client'

import React, { type FC, useState, useEffect, useRef } from 'react'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'
import { DateInput } from './date-input'
import { Label } from './label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select'
import { Switch } from './switch'
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange, rangeCompare?: DateRange }) => void
  /** Initial value for start date */
  initialDateFrom?: Date | string
  /** Initial value for end date */
  initialDateTo?: Date | string
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string
  /** Alignment of popover */
  align?: 'start' | 'center' | 'end'
  /** Option for locale */
  locale?: string
  /** Option for showing compare feature */
  showCompare?: boolean
}

const formatDate = (date: Date, locale: string = 'en-us'): string => {
  if (locale === 'ja-JP') {
    // 日本語の場合はより短い形式 (例: 2024/1/15)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
  }
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === 'string') {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split('-').map((part) => parseInt(part, 10))
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    return date
  } else {
    // If dateInput is already a Date object, return it directly
    return dateInput
  }
}

interface DateRange {
  from: Date
  to: Date | undefined
}

interface Preset {
  name: string
  label: string
}

// Define presets
const PRESETS: Preset[] = [
  { name: 'today', label: '今日' },
  { name: 'yesterday', label: '昨日' },
  { name: 'last7', label: '過去7日' },
  { name: 'last14', label: '過去14日' },
  { name: 'last30', label: '過去30日' },
  { name: 'thisWeek', label: '今週' },
  { name: 'lastWeek', label: '先週' },
  { name: 'thisMonth', label: '今月' },
  { name: 'lastMonth', label: '先月' }
]

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> = ({
  initialDateFrom = new Date(new Date().setHours(0, 0, 0, 0)),
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  onUpdate,
  align = 'end',
  locale = 'ja-JP',
  showCompare = false
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom),
    to: initialDateTo
      ? getDateAdjustedForTimezone(initialDateTo)
      : getDateAdjustedForTimezone(initialDateFrom)
  })
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
          from: new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
          to: initialCompareTo
            ? new Date(new Date(initialCompareTo).setHours(0, 0, 0, 0))
            : new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0))
        }
      : undefined
  )

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>()
  const openedRangeCompareRef = useRef<DateRange | undefined>()

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  )

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960)
    }

    window.addEventListener('resize', handleResize)

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName)
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`)
    const from = new Date()
    const to = new Date()
    const first = from.getDate() - from.getDay()

    switch (preset.name) {
      case 'today':
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'yesterday':
        from.setDate(from.getDate() - 1)
        from.setHours(0, 0, 0, 0)
        to.setDate(to.getDate() - 1)
        to.setHours(23, 59, 59, 999)
        break
      case 'last7':
        from.setDate(from.getDate() - 6)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'last14':
        from.setDate(from.getDate() - 13)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'last30':
        from.setDate(from.getDate() - 29)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'thisWeek':
        from.setDate(first)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'lastWeek':
        from.setDate(from.getDate() - 7 - from.getDay())
        to.setDate(to.getDate() - to.getDay() - 1)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'thisMonth':
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'lastMonth':
        from.setMonth(from.getMonth() - 1)
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        to.setDate(0)
        to.setHours(23, 59, 59, 999)
        break
    }

    return { from, to }
  }

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset)
    setRange(range)
    if (rangeCompare) {
      const rangeCompare = {
        from: new Date(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate()
        ),
        to: range.to
          ? new Date(
            range.to.getFullYear() - 1,
            range.to.getMonth(),
            range.to.getDate()
          )
          : undefined
      }
      setRangeCompare(rangeCompare)
    }
  }

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name)

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(
        presetRange.from.setHours(0, 0, 0, 0)
      )

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0
      )

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name)
        return
      }
    }

    setSelectedPreset(undefined)
  }

  const resetValues = (): void => {
    setRange({
      from:
        typeof initialDateFrom === 'string'
          ? getDateAdjustedForTimezone(initialDateFrom)
          : initialDateFrom,
      to: initialDateTo
        ? typeof initialDateTo === 'string'
          ? getDateAdjustedForTimezone(initialDateTo)
          : initialDateTo
        : typeof initialDateFrom === 'string'
          ? getDateAdjustedForTimezone(initialDateFrom)
          : initialDateFrom
    })
    setRangeCompare(
      initialCompareFrom
        ? {
            from:
              typeof initialCompareFrom === 'string'
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom,
            to: initialCompareTo
              ? typeof initialCompareTo === 'string'
                ? getDateAdjustedForTimezone(initialCompareTo)
                : initialCompareTo
              : typeof initialCompareFrom === 'string'
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom
          }
        : undefined
    )
  }

  useEffect(() => {
    checkPreset()
  }, [range])

  const PresetButton = ({
    preset,
    label,
    isSelected
  }: {
    preset: string
    label: string
    isSelected: boolean
  }): JSX.Element => (
    <Button
      className={cn(isSelected && 'pointer-events-none', 'h-7 px-2 text-xs justify-start')}
      variant="ghost"
      size="sm"
      onClick={() => {
        setPreset(preset)
      }}
    >
      <>
        <span className={cn('pr-1 opacity-0', isSelected && 'opacity-70')}>
          <CheckIcon width={12} height={12} />
        </span>
        {label}
      </>
    </Button>
  )

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b // If either is undefined, return true if both are undefined
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    )
  }

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range
      openedRangeCompareRef.current = rangeCompare
    }
  }, [isOpen])

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues()
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <Button size={'sm'} variant="outline" className="h-9 px-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div>
              <div className="whitespace-nowrap text-xs font-medium">{`${formatDate(range.from, locale)}${
                range.to != null ? ' 〜 ' + formatDate(range.to, locale) : ''
              }`}</div>
              {rangeCompare != null && (
                <div className="opacity-60 text-[10px] leading-tight">
                  vs. {formatDate(rangeCompare.from, locale)}
                  {rangeCompare.to != null
                    ? ` 〜 ${formatDate(rangeCompare.to, locale)}`
                    : ''}
                </div>
              )}
            </div>
            <div className="opacity-60 flex-shrink-0">
              {isOpen ? (<ChevronUpIcon className="h-3 w-3" />) : (<ChevronDownIcon className="h-3 w-3" />)}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-3">
        <div className="flex">
          <div className="flex">
            <div className="flex flex-col">
              <div className="flex flex-col lg:flex-row gap-2 px-2 justify-end items-center lg:items-start pb-3 lg:pb-0">
                {showCompare && (
                  <div className="flex items-center space-x-2 pr-3 py-1">
                    <Switch
                      defaultChecked={Boolean(rangeCompare)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          if (!range.to) {
                            setRange({
                              from: range.from,
                              to: range.from
                            })
                          }
                          setRangeCompare({
                            from: new Date(
                              range.from.getFullYear(),
                              range.from.getMonth(),
                              range.from.getDate() - 365
                            ),
                            to: range.to
                              ? new Date(
                                range.to.getFullYear() - 1,
                                range.to.getMonth(),
                                range.to.getDate()
                              )
                              : new Date(
                                range.from.getFullYear() - 1,
                                range.from.getMonth(),
                                range.from.getDate()
                              )
                          })
                        } else {
                          setRangeCompare(undefined)
                        }
                      }}
                      id="compare-mode"
                    />
                    <Label htmlFor="compare-mode" className="text-xs">比較</Label>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5 items-center">
                    <DateInput
                      value={range.from}
                      onChange={(date) => {
                        const toDate =
                          range.to == null || date > range.to ? date : range.to
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: date,
                          to: toDate
                        }))
                      }}
                    />
                    <div className="text-xs">〜</div>
                    <DateInput
                      value={range.to}
                      onChange={(date) => {
                        const fromDate = date < range.from ? date : range.from
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: fromDate,
                          to: date
                        }))
                      }}
                    />
                  </div>
                  {rangeCompare != null && (
                    <div className="flex gap-1.5 items-center">
                      <DateInput
                        value={rangeCompare?.from}
                        onChange={(date) => {
                          if (rangeCompare) {
                            const compareToDate =
                              rangeCompare.to == null || date > rangeCompare.to
                                ? date
                                : rangeCompare.to
                            setRangeCompare((prevRangeCompare) => ({
                              ...prevRangeCompare,
                              from: date,
                              to: compareToDate
                            }))
                          } else {
                            setRangeCompare({
                              from: date,
                              to: new Date()
                            })
                          }
                        }}
                      />
                      <div className="text-xs">〜</div>
                      <DateInput
                        value={rangeCompare?.to}
                        onChange={(date) => {
                          if (rangeCompare && rangeCompare.from) {
                            const compareFromDate =
                              date < rangeCompare.from
                                ? date
                                : rangeCompare.from
                            setRangeCompare({
                              ...rangeCompare,
                              from: compareFromDate,
                              to: date
                            })
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              { isSmallScreen && (
                <Select defaultValue={selectedPreset} onValueChange={(value) => { setPreset(value) }}>
                  <SelectTrigger className="w-[160px] mx-auto mb-2 h-8 text-xs">
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name} className="text-xs">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="scale-90 origin-top-left">
                <Calendar
                  mode="range"
                  onSelect={(value: { from?: Date, to?: Date } | undefined) => {
                    if (value?.from != null) {
                      setRange({ from: value.from, to: value?.to })
                    }
                  }}
                  selected={range}
                  numberOfMonths={isSmallScreen ? 1 : 2}
                  defaultMonth={
                    new Date(
                      new Date().setMonth(
                        new Date().getMonth() - (isSmallScreen ? 0 : 1)
                      )
                    )
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>
          {!isSmallScreen && (
            <div className="flex flex-col items-end gap-0.5 pr-2 pl-4 pb-4">
              <div className="flex w-full flex-col items-end gap-0.5">
                {PRESETS.map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 py-2 border-t mt-2 pt-2">
          <Button
            onClick={() => {
              setIsOpen(false)
              resetValues()
            }}
            variant="ghost"
            size="sm"
            className="text-xs h-7"
          >
            キャンセル
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false)
              if (
                !areRangesEqual(range, openedRangeRef.current) ||
                !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
              ) {
                onUpdate?.({ range, rangeCompare })
              }
            }}
            size="sm"
            className="text-xs h-7"
          >
            更新
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

DateRangePicker.displayName = 'DateRangePicker'