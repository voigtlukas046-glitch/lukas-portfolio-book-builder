'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Minus,
  Move,
  Pencil,
  Plus,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
} from 'lucide-react';

import { PortfolioBookPage } from '@/components/book/editable-book-page';
import { InteractiveBook } from '@/components/book/interactive-book';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BOOK_PAGE_HEIGHT,
  BOOK_PAGE_WIDTH,
  createBlankPage,
  createButtonElement,
  createImageElement,
  createLineElement,
  createPageNumberElement,
  createPortfolioId,
  createProjectOverviewPage,
  createShapeElement,
  createTextElement,
  initialPortfolioProject,
  normalizePortfolioProject,
  type ButtonElement,
  type ImageElement,
  type LineElement,
  type PageNumberElement,
  type PageRole,
  type PortfolioAsset,
  type PortfolioElement,
  type PortfolioPage,
  type PortfolioProject,
  type ShapeElement,
  type TextAlign,
  type TextElement,
  type TextRole,
  type TextTransform,
} from '@/lib/portfolio-project';
import {
  loadStoredPortfolioProject,
  saveStoredPortfolioProject,
} from '@/lib/portfolio-storage';
import { cn } from '@/lib/utils';

type EditorMode = 'edit' | 'preview';
type SaveStatus = 'Loading' | 'Saving' | 'Saved' | 'Error';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 's';
type AddElementKind =
  | 'heading'
  | 'paragraph'
  | 'caption'
  | 'image'
  | 'shape'
  | 'line'
  | 'button'
  | 'page-number';

type DragState = {
  kind: 'move' | 'resize';
  pageId: string;
  elementId: string;
  startX: number;
  startY: number;
  element: PortfolioElement;
  handle?: ResizeHandle;
};

type HistoryEntry = {
  project: PortfolioProject;
  selectedPageId: string;
  selectedElementId: string | null;
};

type ZoomMode = 'fit' | 'manual';

const HISTORY_LIMIT = 45;
const GRID_SIZE = 10;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.05;
const CANVAS_FIT_PADDING = 64;

function cloneProject(project: PortfolioProject): PortfolioProject {
  return JSON.parse(JSON.stringify(project)) as PortfolioProject;
}

function createHistoryEntry(
  project: PortfolioProject,
  selectedPageId: string,
  selectedElementId: string | null,
): HistoryEntry {
  return {
    project: cloneProject(project),
    selectedPageId,
    selectedElementId,
  };
}

function cloneElement(
  element: PortfolioElement,
  zIndex: number,
): PortfolioElement {
  const copy = JSON.parse(JSON.stringify(element)) as PortfolioElement;

  return {
    ...copy,
    id: createPortfolioId(element.type),
    x: Math.min(BOOK_PAGE_WIDTH - Math.max(40, copy.width), copy.x + 22),
    y: Math.min(BOOK_PAGE_HEIGHT - Math.max(40, copy.height), copy.y + 22),
    zIndex,
    locked: false,
    hidden: false,
  } as PortfolioElement;
}

function clonePage(page: PortfolioPage): PortfolioPage {
  return {
    ...cloneProject({
      ...initialPortfolioProject,
      pages: [page],
    }).pages[0],
    id: createPortfolioId('page'),
    name: `${page.name} Copy`,
    elements: page.elements.map((element, index) => ({
      ...cloneElement(element, index + 1),
      zIndex: element.zIndex,
    })),
  };
}

function stampProject(project: PortfolioProject): PortfolioProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

function isTextElement(
  element: PortfolioElement | undefined,
): element is TextElement {
  return element?.type === 'text';
}

function isPageNumberElement(
  element: PortfolioElement | undefined,
): element is PageNumberElement {
  return element?.type === 'page-number';
}

function isImageElement(
  element: PortfolioElement | undefined,
): element is ImageElement {
  return element?.type === 'image';
}

function isShapeElement(
  element: PortfolioElement | undefined,
): element is ShapeElement {
  return element?.type === 'shape';
}

function isLineElement(
  element: PortfolioElement | undefined,
): element is LineElement {
  return element?.type === 'line';
}

function isButtonElement(
  element: PortfolioElement | undefined,
): element is ButtonElement {
  return element?.type === 'button';
}

function maxZIndex(page?: PortfolioPage) {
  return (
    page?.elements.reduce((max, element) => Math.max(max, element.zIndex), 0) ??
    0
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, enabled: boolean) {
  return enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
}

function normalizeZoom(value: number) {
  return clamp(Math.round(value * 100) / 100, MIN_ZOOM, MAX_ZOOM);
}

function isTextEntry(target: EventTarget | null) {
  const element = target as HTMLElement | null;

  return (
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    element?.tagName === 'SELECT' ||
    element?.isContentEditable
  );
}

function elementDisplayName(element: PortfolioElement) {
  if (element.type === 'text')
    return `${element.role}: ${element.content || 'Text'}`;
  if (element.type === 'image')
    return element.caption || element.label || 'Image frame';
  if (element.type === 'button') return `Button: ${element.label}`;
  if (element.type === 'page-number') return 'Page number';
  return element.type === 'shape' ? 'Shape' : 'Line';
}

function createElementForKind(
  kind: AddElementKind,
  zIndex: number,
): PortfolioElement {
  if (kind === 'heading' || kind === 'paragraph' || kind === 'caption') {
    return createTextElement(kind as TextRole, zIndex);
  }

  if (kind === 'image') return createImageElement(zIndex);
  if (kind === 'shape') return createShapeElement(zIndex);
  if (kind === 'line') return createLineElement(zIndex);
  if (kind === 'button') return createButtonElement(zIndex);

  return createPageNumberElement(zIndex);
}

function fieldNumber(value: string, fallback: number) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function updateElementInProject(
  project: PortfolioProject,
  pageId: string,
  elementId: string,
  updater: (element: PortfolioElement) => PortfolioElement,
) {
  return {
    ...project,
    pages: project.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            elements: page.elements.map((element) =>
              element.id === elementId ? updater(element) : element,
            ),
          }
        : page,
    ),
  };
}

function useSelectedProjectParts(
  project: PortfolioProject,
  selectedPageId: string,
  selectedElementId: string | null,
) {
  return useMemo(() => {
    const selectedPage =
      project.pages.find((page) => page.id === selectedPageId) ??
      project.pages[0];
    const selectedElement = selectedPage?.elements.find(
      (element) => element.id === selectedElementId,
    );

    return { selectedPage, selectedElement };
  }, [project.pages, selectedElementId, selectedPageId]);
}

function Field({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <label className={cn('property-field', compact && 'is-compact')}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} compact>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isInteger(value) ? value : Number(value.toFixed(2))}
        onChange={(event) => onChange(fieldNumber(event.target.value, value))}
      />
    </Field>
  );
}

function NativeSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      className="editor-select"
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('The selected image could not be read.'));
    };
    reader.readAsDataURL(file);
  });
}

async function imageDimensions(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new window.Image();

    image.onload = () =>
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

export function PortfolioBuilder() {
  const [project, setProject] = useState<PortfolioProject>(
    initialPortfolioProject,
  );
  const [mode, setMode] = useState<EditorMode>('edit');
  const [selectedPageId, setSelectedPageId] = useState(
    initialPortfolioProject.pages[0]?.id ?? '',
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading');
  const [hydrated, setHydrated] = useState(false);
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [clipboardElement, setClipboardElement] =
    useState<PortfolioElement | null>(null);
  const [zoom, setZoom] = useState(0.78);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const pageThumbnailListRef = useRef<HTMLDivElement>(null);
  const zoomModeRef = useRef<ZoomMode>('fit');
  const interactionSnapshotRef = useRef<HistoryEntry | null>(null);
  const interactionChangedRef = useRef(false);

  const { selectedPage, selectedElement } = useSelectedProjectParts(
    project,
    selectedPageId,
    selectedElementId,
  );

  const selectedPageIndex = useMemo(
    () => project.pages.findIndex((page) => page.id === selectedPage?.id),
    [project.pages, selectedPage?.id],
  );
  const selectedPageElementMaxZ = maxZIndex(selectedPage);

  useEffect(() => {
    zoomModeRef.current = zoomMode;
  }, [zoomMode]);

  const calculateFitZoom = useCallback(() => {
    const canvas = canvasScrollRef.current;
    if (!canvas) return 0.78;

    const rect = canvas.getBoundingClientRect();
    const availableWidth = Math.max(1, rect.width - CANVAS_FIT_PADDING);
    const availableHeight = Math.max(1, rect.height - CANVAS_FIT_PADDING);

    return normalizeZoom(
      Math.min(
        availableWidth / BOOK_PAGE_WIDTH,
        availableHeight / BOOK_PAGE_HEIGHT,
      ),
    );
  }, []);

  const refreshFitZoom = useCallback(() => {
    const nextZoom = calculateFitZoom();
    if (zoomModeRef.current === 'fit') setZoom(nextZoom);
  }, [calculateFitZoom]);

  const fitCanvasToWorkspace = useCallback(() => {
    setZoomMode('fit');
    setZoom(calculateFitZoom());
  }, [calculateFitZoom]);

  const setManualZoom = useCallback((nextZoom: number) => {
    setZoomMode('manual');
    setZoom(normalizeZoom(nextZoom));
  }, []);

  const stepZoom = useCallback((delta: number) => {
    setZoomMode('manual');
    setZoom((currentZoom) => normalizeZoom(currentZoom + delta));
  }, []);

  useEffect(() => {
    const canvas = canvasScrollRef.current;
    if (!canvas) return;

    const timeout = window.setTimeout(refreshFitZoom, 0);
    const observer =
      'ResizeObserver' in window ? new ResizeObserver(refreshFitZoom) : null;

    observer?.observe(canvas);
    window.addEventListener('resize', refreshFitZoom);

    return () => {
      window.clearTimeout(timeout);
      observer?.disconnect();
      window.removeEventListener('resize', refreshFitZoom);
    };
  }, [refreshFitZoom]);

  useEffect(() => {
    const selectedThumbnail =
      pageThumbnailListRef.current?.querySelector<HTMLButtonElement>(
        '[data-selected="true"]',
      );

    selectedThumbnail?.scrollIntoView({ block: 'nearest' });
  }, [selectedPageId]);

  const commitProject = useCallback(
    (updater: (current: PortfolioProject) => PortfolioProject) => {
      setSaveStatus('Saving');
      setProject((current) => {
        const nextProject = stampProject(updater(current));
        setPast((history) => [
          ...history.slice(-(HISTORY_LIMIT - 1)),
          createHistoryEntry(current, selectedPageId, selectedElementId),
        ]);
        setFuture([]);
        return nextProject;
      });
    },
    [selectedElementId, selectedPageId],
  );

  const updateProjectSilently = useCallback(
    (updater: (current: PortfolioProject) => PortfolioProject) => {
      setSaveStatus('Saving');
      setProject((current) => updater(current));
    },
    [],
  );

  const undo = useCallback(() => {
    setPast((history) => {
      if (history.length === 0) return history;

      setSaveStatus('Saving');
      const previous = history[history.length - 1];
      setFuture((redoHistory) =>
        [
          createHistoryEntry(project, selectedPageId, selectedElementId),
          ...redoHistory,
        ].slice(0, HISTORY_LIMIT),
      );
      setProject(previous.project);
      setSelectedPageId(previous.selectedPageId);
      setSelectedElementId(previous.selectedElementId);
      return history.slice(0, -1);
    });
  }, [project, selectedElementId, selectedPageId]);

  const redo = useCallback(() => {
    setFuture((redoHistory) => {
      if (redoHistory.length === 0) return redoHistory;

      setSaveStatus('Saving');
      const next = redoHistory[0];
      setPast((history) => [
        ...history.slice(-(HISTORY_LIMIT - 1)),
        createHistoryEntry(project, selectedPageId, selectedElementId),
      ]);
      setProject(next.project);
      setSelectedPageId(next.selectedPageId);
      setSelectedElementId(next.selectedElementId);
      return redoHistory.slice(1);
    });
  }, [project, selectedElementId, selectedPageId]);

  const updateSelectedPage = useCallback(
    (updater: (page: PortfolioPage) => PortfolioPage) => {
      if (!selectedPage) return;

      commitProject((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === selectedPage.id ? updater(page) : page,
        ),
      }));
    },
    [commitProject, selectedPage],
  );

  const updateSelectedElement = useCallback(
    (updater: (element: PortfolioElement) => PortfolioElement) => {
      if (!selectedPage || !selectedElement) return;

      commitProject((current) =>
        updateElementInProject(
          current,
          selectedPage.id,
          selectedElement.id,
          updater,
        ),
      );
    },
    [commitProject, selectedElement, selectedPage],
  );

  useEffect(() => {
    let disposed = false;

    async function restoreProject() {
      const storedProject = await loadStoredPortfolioProject();
      if (disposed) return;

      if (storedProject) {
        setProject(storedProject);
        setSelectedPageId(storedProject.pages[0]?.id ?? '');
      }

      setSaveStatus('Saved');
      setHydrated(true);
    }

    void restoreProject();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const timeout = window.setTimeout(() => {
      void saveStoredPortfolioProject(project)
        .then(() => setSaveStatus('Saved'))
        .catch(() => setSaveStatus('Error'));
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [hydrated, project]);

  const selectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedElementId(null);
  }, []);

  const addPage = useCallback(
    (template: 'blank' | 'overview') => {
      const newPage =
        template === 'overview'
          ? createProjectOverviewPage(project.pages.length + 1)
          : createBlankPage(project.pages.length + 1);
      const insertIndex =
        selectedPageIndex >= 0 ? selectedPageIndex + 1 : project.pages.length;

      commitProject((current) => ({
        ...current,
        pages: [
          ...current.pages.slice(0, insertIndex),
          newPage,
          ...current.pages.slice(insertIndex),
        ],
      }));
      setSelectedPageId(newPage.id);
      setSelectedElementId(null);
    },
    [commitProject, project.pages.length, selectedPageIndex],
  );

  const duplicatePage = useCallback(
    (page: PortfolioPage) => {
      const copiedPage = clonePage(page);
      const pageIndex = project.pages.findIndex(
        (entry) => entry.id === page.id,
      );

      commitProject((current) => ({
        ...current,
        pages: [
          ...current.pages.slice(0, pageIndex + 1),
          copiedPage,
          ...current.pages.slice(pageIndex + 1),
        ],
      }));
      setSelectedPageId(copiedPage.id);
      setSelectedElementId(null);
    },
    [commitProject, project.pages],
  );

  const deletePage = useCallback(
    (page: PortfolioPage) => {
      if (project.pages.length <= 1) return;

      const confirmed = window.confirm(`Delete "${page.name}" from this book?`);
      if (!confirmed) return;

      const pageIndex = project.pages.findIndex(
        (entry) => entry.id === page.id,
      );
      const nextPageId =
        project.pages[pageIndex + 1]?.id ??
        project.pages[pageIndex - 1]?.id ??
        project.pages[0].id;

      commitProject((current) => ({
        ...current,
        pages: current.pages.filter((entry) => entry.id !== page.id),
      }));
      setSelectedPageId(nextPageId);
      setSelectedElementId(null);
    },
    [commitProject, project.pages],
  );

  const movePage = useCallback(
    (pageId: string, direction: -1 | 1) => {
      const pageIndex = project.pages.findIndex((page) => page.id === pageId);
      const nextIndex = pageIndex + direction;
      if (pageIndex < 0 || nextIndex < 0 || nextIndex >= project.pages.length)
        return;

      commitProject((current) => {
        const pages = [...current.pages];
        const [page] = pages.splice(pageIndex, 1);
        pages.splice(nextIndex, 0, page);

        return { ...current, pages };
      });
    },
    [commitProject, project.pages],
  );

  const reorderPages = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;

      const sourceIndex = project.pages.findIndex(
        (page) => page.id === sourceId,
      );
      const targetIndex = project.pages.findIndex(
        (page) => page.id === targetId,
      );
      if (sourceIndex < 0 || targetIndex < 0) return;

      commitProject((current) => {
        const pages = [...current.pages];
        const [page] = pages.splice(sourceIndex, 1);
        pages.splice(targetIndex, 0, page);

        return { ...current, pages };
      });
    },
    [commitProject, project.pages],
  );

  const addElement = useCallback(
    (kind: AddElementKind) => {
      if (!selectedPage) return;

      const targetPageId = selectedPage.id;
      const zIndex = selectedPageElementMaxZ + 1;
      const element = createElementForKind(kind, zIndex);

      commitProject((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === targetPageId
            ? { ...page, elements: [...page.elements, element] }
            : page,
        ),
      }));
      setSelectedElementId(element.id);
    },
    [commitProject, selectedPage, selectedPageElementMaxZ],
  );

  const deleteSelectedElement = useCallback(() => {
    if (!selectedPage || !selectedElement) return;

    commitProject((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === selectedPage.id
          ? {
              ...page,
              elements: page.elements.filter(
                (element) => element.id !== selectedElement.id,
              ),
            }
          : page,
      ),
    }));
    setSelectedElementId(null);
  }, [commitProject, selectedElement, selectedPage]);

  const duplicateSelectedElement = useCallback(() => {
    if (!selectedPage || !selectedElement) return;

    const copiedElement = cloneElement(
      selectedElement,
      maxZIndex(selectedPage) + 1,
    );

    commitProject((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === selectedPage.id
          ? { ...page, elements: [...page.elements, copiedElement] }
          : page,
      ),
    }));
    setSelectedElementId(copiedElement.id);
  }, [commitProject, selectedElement, selectedPage]);

  const bringForward = useCallback(() => {
    if (!selectedPage || !selectedElement) return;
    const nextZIndex = maxZIndex(selectedPage) + 1;

    updateSelectedElement(
      (element) => ({ ...element, zIndex: nextZIndex }) as PortfolioElement,
    );
  }, [selectedElement, selectedPage, updateSelectedElement]);

  const sendBackward = useCallback(() => {
    if (!selectedElement) return;
    updateSelectedElement(
      (element) => ({ ...element, zIndex: 1 }) as PortfolioElement,
    );
  }, [selectedElement, updateSelectedElement]);

  const alignSelected = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!selectedElement) return;

      updateSelectedElement((element) => {
        const nextElement = { ...element };

        if (alignment === 'left') nextElement.x = 48;
        if (alignment === 'center')
          nextElement.x = (BOOK_PAGE_WIDTH - element.width) / 2;
        if (alignment === 'right')
          nextElement.x = BOOK_PAGE_WIDTH - element.width - 48;
        if (alignment === 'top') nextElement.y = 48;
        if (alignment === 'middle')
          nextElement.y = (BOOK_PAGE_HEIGHT - element.height) / 2;
        if (alignment === 'bottom')
          nextElement.y = BOOK_PAGE_HEIGHT - element.height - 58;

        return nextElement as PortfolioElement;
      });
    },
    [selectedElement, updateSelectedElement],
  );

  const addAssetFromFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      window.alert('Choose an image file for the portfolio asset library.');
      return null;
    }

    const dataUrl = await fileToDataUrl(file);
    const dimensions = await imageDimensions(dataUrl);

    return {
      id: createPortfolioId('asset'),
      name: file.name,
      mimeType: file.type,
      dataUrl,
      createdAt: new Date().toISOString(),
      width: dimensions.width,
      height: dimensions.height,
    } satisfies PortfolioAsset;
  }, []);

  const attachAssetToImage = useCallback(
    (asset: PortfolioAsset) => {
      if (!selectedPage) return;

      const imageElement =
        selectedElement?.type === 'image'
          ? selectedElement
          : {
              ...createImageElement(selectedPageElementMaxZ + 1),
              assetId: asset.id,
              label: asset.name,
              caption: asset.name,
              alt: asset.name,
            };

      commitProject((current) => ({
        ...current,
        assets: current.assets.some((entry) => entry.id === asset.id)
          ? current.assets
          : [...current.assets, asset],
        pages: current.pages.map((page) => {
          if (page.id !== selectedPage.id) return page;

          if (selectedElement?.type === 'image') {
            return {
              ...page,
              elements: page.elements.map((element) =>
                element.id === selectedElement.id
                  ? ({
                      ...element,
                      assetId: asset.id,
                      label: asset.name,
                      alt:
                        element.type === 'image'
                          ? element.alt || asset.name
                          : asset.name,
                    } as PortfolioElement)
                  : element,
              ),
            };
          }

          return {
            ...page,
            elements: [...page.elements, imageElement],
          };
        }),
      }));
      setSelectedElementId(imageElement.id);
    },
    [commitProject, selectedElement, selectedPage, selectedPageElementMaxZ],
  );

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      void addAssetFromFile(file).then((asset) => {
        if (asset) attachAssetToImage(asset);
      });
    },
    [addAssetFromFile, attachAssetToImage],
  );

  const exportProject = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${project.id || 'portfolio-book'}-backup.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 600);
  }, [project]);

  const handleImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (typeof reader.result !== 'string') {
            throw new Error('The file did not contain text.');
          }

          const importedProject = normalizePortfolioProject(
            JSON.parse(reader.result),
          );

          if (!importedProject) {
            throw new Error(
              'The file does not match the portfolio project format.',
            );
          }

          commitProject(() => importedProject);
          setSelectedPageId(importedProject.pages[0]?.id ?? '');
          setSelectedElementId(null);
        } catch {
          window.alert(
            'This JSON file could not be imported as a portfolio project.',
          );
        }
      };
      reader.readAsText(file);
    },
    [commitProject],
  );

  const beginElementMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>, element: PortfolioElement) => {
      if (!selectedPage || element.locked) return;

      interactionSnapshotRef.current = createHistoryEntry(
        project,
        selectedPageId,
        element.id,
      );
      interactionChangedRef.current = false;
      setDragState({
        kind: 'move',
        pageId: selectedPage.id,
        elementId: element.id,
        startX: event.clientX,
        startY: event.clientY,
        element,
      });
    },
    [project, selectedPage, selectedPageId],
  );

  const beginElementResize = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      element: PortfolioElement,
      handle: ResizeHandle,
    ) => {
      if (!selectedPage || element.locked) return;

      interactionSnapshotRef.current = createHistoryEntry(
        project,
        selectedPageId,
        element.id,
      );
      interactionChangedRef.current = false;
      setDragState({
        kind: 'resize',
        pageId: selectedPage.id,
        elementId: element.id,
        startX: event.clientX,
        startY: event.clientY,
        element,
        handle,
      });
    },
    [project, selectedPage, selectedPageId],
  );

  useEffect(() => {
    if (!dragState) return;
    const activeDrag = dragState;

    function commitInteractionHistory() {
      if (!interactionSnapshotRef.current) return;

      setPast((history) => [
        ...history.slice(-(HISTORY_LIMIT - 1)),
        interactionSnapshotRef.current as HistoryEntry,
      ]);
      setFuture([]);
      interactionSnapshotRef.current = null;
      interactionChangedRef.current = true;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();

      const deltaX = (event.clientX - activeDrag.startX) / zoom;
      const deltaY = (event.clientY - activeDrag.startY) / zoom;
      const start = activeDrag.element;
      let nextX = start.x;
      let nextY = start.y;
      let nextWidth = start.width;
      let nextHeight = start.height;
      const minSize = start.type === 'line' ? 8 : 24;

      if (activeDrag.kind === 'move') {
        nextX = snap(
          clamp(start.x + deltaX, 0, BOOK_PAGE_WIDTH - start.width),
          snapToGrid,
        );
        nextY = snap(
          clamp(start.y + deltaY, 0, BOOK_PAGE_HEIGHT - start.height),
          snapToGrid,
        );
      } else {
        const handle = activeDrag.handle ?? 'se';

        if (handle.includes('e')) {
          nextWidth = snap(
            clamp(start.width + deltaX, minSize, BOOK_PAGE_WIDTH - start.x),
            snapToGrid,
          );
        }

        if (handle.includes('s')) {
          nextHeight = snap(
            clamp(start.height + deltaY, minSize, BOOK_PAGE_HEIGHT - start.y),
            snapToGrid,
          );
        }

        if (handle.includes('w')) {
          nextX = snap(
            clamp(start.x + deltaX, 0, start.x + start.width - minSize),
            snapToGrid,
          );
          nextWidth = start.x + start.width - nextX;
        }

        if (handle.includes('n')) {
          nextY = snap(
            clamp(start.y + deltaY, 0, start.y + start.height - minSize),
            snapToGrid,
          );
          nextHeight = start.y + start.height - nextY;
        }
      }

      commitInteractionHistory();
      updateProjectSilently((current) =>
        updateElementInProject(
          current,
          activeDrag.pageId,
          activeDrag.elementId,
          (element) =>
            ({
              ...element,
              x: clamp(nextX, 0, BOOK_PAGE_WIDTH - nextWidth),
              y: clamp(nextY, 0, BOOK_PAGE_HEIGHT - nextHeight),
              width: clamp(nextWidth, minSize, BOOK_PAGE_WIDTH),
              height: clamp(nextHeight, minSize, BOOK_PAGE_HEIGHT),
            }) as PortfolioElement,
        ),
      );
    }

    function handlePointerUp() {
      interactionSnapshotRef.current = null;
      setDragState(null);
      if (interactionChangedRef.current) {
        setProject((current) => stampProject(current));
      }
      interactionChangedRef.current = false;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, snapToGrid, updateProjectSilently, zoom]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifier = event.ctrlKey || event.metaKey;

      if (mode !== 'edit') return;
      if (isTextEntry(event.target)) return;

      if (isModifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (isModifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (isModifier && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        stepZoom(ZOOM_STEP);
        return;
      }

      if (isModifier && event.key === '-') {
        event.preventDefault();
        stepZoom(-ZOOM_STEP);
        return;
      }

      if (isModifier && event.key === '0') {
        event.preventDefault();
        fitCanvasToWorkspace();
        return;
      }

      if (!selectedElement) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedElement();
        return;
      }

      if (isModifier && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelectedElement();
        return;
      }

      if (isModifier && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setClipboardElement(
          cloneElement(selectedElement, selectedElement.zIndex),
        );
        return;
      }

      if (
        isModifier &&
        event.key.toLowerCase() === 'v' &&
        clipboardElement &&
        selectedPage
      ) {
        event.preventDefault();
        const pasted = cloneElement(
          clipboardElement,
          maxZIndex(selectedPage) + 1,
        );

        commitProject((current) => ({
          ...current,
          pages: current.pages.map((page) =>
            page.id === selectedPage.id
              ? { ...page, elements: [...page.elements, pasted] }
              : page,
          ),
        }));
        setSelectedElementId(pasted.id);
        return;
      }

      const nudge = event.shiftKey ? 10 : 1;
      const nudges: Record<string, [number, number]> = {
        ArrowLeft: [-nudge, 0],
        ArrowRight: [nudge, 0],
        ArrowUp: [0, -nudge],
        ArrowDown: [0, nudge],
      };
      const nudgeDelta = nudges[event.key];

      if (nudgeDelta) {
        event.preventDefault();
        updateSelectedElement(
          (element) =>
            ({
              ...element,
              x: clamp(
                element.x + nudgeDelta[0],
                0,
                BOOK_PAGE_WIDTH - element.width,
              ),
              y: clamp(
                element.y + nudgeDelta[1],
                0,
                BOOK_PAGE_HEIGHT - element.height,
              ),
            }) as PortfolioElement,
        );
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clipboardElement,
    commitProject,
    deleteSelectedElement,
    duplicateSelectedElement,
    fitCanvasToWorkspace,
    mode,
    redo,
    selectedElement,
    selectedPage,
    stepZoom,
    undo,
    updateSelectedElement,
  ]);

  const updateTextStyle = useCallback(
    (style: Partial<TextElement['style']>) => {
      updateSelectedElement((element) => {
        if (!isTextElement(element) && !isPageNumberElement(element))
          return element;

        return {
          ...element,
          style: {
            ...element.style,
            ...style,
          },
        } as PortfolioElement;
      });
    },
    [updateSelectedElement],
  );

  const updateButtonStyle = useCallback(
    (style: Partial<ButtonElement['style']>) => {
      updateSelectedElement((element) => {
        if (!isButtonElement(element)) return element;

        return {
          ...element,
          style: {
            ...element.style,
            ...style,
          },
        } as PortfolioElement;
      });
    },
    [updateSelectedElement],
  );

  const renderPageProperties = () => {
    if (!selectedPage) return null;

    return (
      <>
        <section className="property-section">
          <div className="property-section-heading">
            <span>Page</span>
            <b>{String(selectedPageIndex + 1).padStart(2, '0')}</b>
          </div>
          <Field label="Internal name">
            <Input
              value={selectedPage.name}
              onChange={(event) =>
                updateSelectedPage((page) => ({
                  ...page,
                  name: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Contents label">
            <Input
              value={selectedPage.contentsLabel ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                updateSelectedPage((page) => ({
                  ...page,
                  contentsLabel: event.target.value || undefined,
                }))
              }
            />
          </Field>
          <Field label="Page role">
            <NativeSelect<PageRole>
              label="Page role"
              value={selectedPage.role}
              onChange={(role) =>
                updateSelectedPage((page) => ({
                  ...page,
                  role,
                  background:
                    role === 'cover' || role === 'back-cover'
                      ? project.theme.ink
                      : project.theme.paper,
                }))
              }
              options={[
                { label: 'Cover', value: 'cover' },
                { label: 'Standard page', value: 'page' },
                { label: 'Back cover', value: 'back-cover' },
              ]}
            />
          </Field>
          <Field label="Background">
            <Input
              type="color"
              value={selectedPage.background}
              onChange={(event) =>
                updateSelectedPage((page) => ({
                  ...page,
                  background: event.target.value,
                }))
              }
            />
          </Field>
        </section>

        <section className="property-section">
          <div className="property-section-heading">
            <span>Layers</span>
            <b>{selectedPage.elements.length}</b>
          </div>
          <div className="layer-list">
            {[...selectedPage.elements]
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((element) => (
                <button
                  type="button"
                  key={element.id}
                  className={cn(
                    'layer-row',
                    selectedElementId === element.id && 'is-selected',
                  )}
                  onClick={() => setSelectedElementId(element.id)}
                >
                  <span>{elementDisplayName(element)}</span>
                  {element.hidden ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              ))}
          </div>
        </section>
      </>
    );
  };

  const renderElementProperties = () => {
    if (!selectedElement) return renderPageProperties();

    const canEditText =
      isTextElement(selectedElement) || isPageNumberElement(selectedElement);

    return (
      <>
        <section className="property-section">
          <div className="property-section-heading">
            <span>{elementDisplayName(selectedElement)}</span>
            <b>{selectedElement.type}</b>
          </div>
          <div className="property-grid property-grid-four">
            <NumberField
              label="X"
              value={selectedElement.x}
              min={0}
              max={BOOK_PAGE_WIDTH}
              onChange={(value) =>
                updateSelectedElement(
                  (element) =>
                    ({
                      ...element,
                      x: clamp(value, 0, BOOK_PAGE_WIDTH),
                    }) as PortfolioElement,
                )
              }
            />
            <NumberField
              label="Y"
              value={selectedElement.y}
              min={0}
              max={BOOK_PAGE_HEIGHT}
              onChange={(value) =>
                updateSelectedElement(
                  (element) =>
                    ({
                      ...element,
                      y: clamp(value, 0, BOOK_PAGE_HEIGHT),
                    }) as PortfolioElement,
                )
              }
            />
            <NumberField
              label="W"
              value={selectedElement.width}
              min={4}
              max={BOOK_PAGE_WIDTH}
              onChange={(value) =>
                updateSelectedElement(
                  (element) =>
                    ({
                      ...element,
                      width: clamp(value, 4, BOOK_PAGE_WIDTH),
                    }) as PortfolioElement,
                )
              }
            />
            <NumberField
              label="H"
              value={selectedElement.height}
              min={4}
              max={BOOK_PAGE_HEIGHT}
              onChange={(value) =>
                updateSelectedElement(
                  (element) =>
                    ({
                      ...element,
                      height: clamp(value, 4, BOOK_PAGE_HEIGHT),
                    }) as PortfolioElement,
                )
              }
            />
          </div>

          <div className="property-button-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateSelectedElement(
                  (element) =>
                    ({
                      ...element,
                      locked: !element.locked,
                    }) as PortfolioElement,
                )
              }
            >
              {selectedElement.locked ? (
                <Lock aria-hidden="true" />
              ) : (
                <Unlock aria-hidden="true" />
              )}
              {selectedElement.locked ? 'Locked' : 'Unlocked'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateSelectedElement(
                  (element) =>
                    ({
                      ...element,
                      hidden: !element.hidden,
                    }) as PortfolioElement,
                )
              }
            >
              {selectedElement.hidden ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
              {selectedElement.hidden ? 'Hidden' : 'Visible'}
            </Button>
          </div>
        </section>

        {canEditText ? (
          <section className="property-section">
            <div className="property-section-heading">
              <span>Typography</span>
              <b>Text</b>
            </div>
            {isTextElement(selectedElement) ? (
              <Field label="Text">
                <Textarea
                  value={selectedElement.content}
                  onChange={(event) =>
                    updateSelectedElement((element) =>
                      element.type === 'text'
                        ? ({
                            ...element,
                            content: event.target.value,
                          } as PortfolioElement)
                        : element,
                    )
                  }
                />
              </Field>
            ) : null}
            <div className="property-grid property-grid-two">
              <NumberField
                label="Size"
                value={selectedElement.style.fontSize}
                min={6}
                max={180}
                onChange={(value) => updateTextStyle({ fontSize: value })}
              />
              <NumberField
                label="Line"
                value={selectedElement.style.lineHeight}
                min={0.7}
                max={3}
                step={0.05}
                onChange={(value) => updateTextStyle({ lineHeight: value })}
              />
              <NumberField
                label="Weight"
                value={selectedElement.style.fontWeight}
                min={100}
                max={1000}
                step={50}
                onChange={(value) => updateTextStyle({ fontWeight: value })}
              />
              <NumberField
                label="Track"
                value={selectedElement.style.letterSpacing}
                min={-10}
                max={40}
                onChange={(value) => updateTextStyle({ letterSpacing: value })}
              />
            </div>
            <Field label="Font">
              <NativeSelect<string>
                label="Font family"
                value={selectedElement.style.fontFamily}
                onChange={(fontFamily) => updateTextStyle({ fontFamily })}
                options={[
                  { label: 'Studio sans', value: project.theme.fontSans },
                  { label: 'Studio mono', value: project.theme.fontMono },
                  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
                  { label: 'Georgia', value: 'Georgia, serif' },
                ]}
              />
            </Field>
            <div className="property-button-row">
              {(['left', 'center', 'right'] as TextAlign[]).map((alignment) => (
                <Button
                  type="button"
                  variant={
                    selectedElement.style.textAlign === alignment
                      ? 'default'
                      : 'outline'
                  }
                  size="icon-sm"
                  key={alignment}
                  onClick={() => updateTextStyle({ textAlign: alignment })}
                  aria-label={`Align ${alignment}`}
                >
                  {alignment === 'left' ? (
                    <AlignLeft aria-hidden="true" />
                  ) : alignment === 'center' ? (
                    <AlignCenter aria-hidden="true" />
                  ) : (
                    <AlignRight aria-hidden="true" />
                  )}
                </Button>
              ))}
              <Button
                type="button"
                variant={
                  selectedElement.style.fontStyle === 'italic'
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() =>
                  updateTextStyle({
                    fontStyle:
                      selectedElement.style.fontStyle === 'italic'
                        ? 'normal'
                        : 'italic',
                  })
                }
              >
                Italic
              </Button>
            </div>
            <div className="property-grid property-grid-two">
              <Field label="Case">
                <NativeSelect<TextTransform>
                  label="Text case"
                  value={selectedElement.style.textTransform}
                  onChange={(textTransform) =>
                    updateTextStyle({ textTransform })
                  }
                  options={[
                    { label: 'Normal', value: 'none' },
                    { label: 'Uppercase', value: 'uppercase' },
                    { label: 'Lowercase', value: 'lowercase' },
                  ]}
                />
              </Field>
              <Field label="Colour">
                <Input
                  type="color"
                  value={selectedElement.style.color}
                  onChange={(event) =>
                    updateTextStyle({ color: event.target.value })
                  }
                />
              </Field>
            </div>
          </section>
        ) : null}

        {isImageElement(selectedElement) ? (
          <section className="property-section">
            <div className="property-section-heading">
              <span>Image frame</span>
              <b>{selectedElement.fit}</b>
            </div>
            <div className="property-button-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload aria-hidden="true" />
                Replace
              </Button>
            </div>
            <Field label="Alt text">
              <Input
                value={selectedElement.alt}
                onChange={(event) =>
                  updateSelectedElement((element) =>
                    element.type === 'image'
                      ? ({
                          ...element,
                          alt: event.target.value,
                        } as PortfolioElement)
                      : element,
                  )
                }
              />
            </Field>
            <Field label="Caption">
              <Input
                value={selectedElement.caption ?? ''}
                onChange={(event) =>
                  updateSelectedElement((element) =>
                    element.type === 'image'
                      ? ({
                          ...element,
                          caption: event.target.value || undefined,
                        } as PortfolioElement)
                      : element,
                  )
                }
              />
            </Field>
            <div className="property-grid property-grid-two">
              <Field label="Fit">
                <NativeSelect<ImageElement['fit']>
                  label="Image fit"
                  value={selectedElement.fit}
                  onChange={(fit) =>
                    updateSelectedElement((element) =>
                      element.type === 'image'
                        ? ({ ...element, fit } as PortfolioElement)
                        : element,
                    )
                  }
                  options={[
                    { label: 'Cover', value: 'cover' },
                    { label: 'Contain', value: 'contain' },
                    { label: 'Original', value: 'original' },
                  ]}
                />
              </Field>
              <NumberField
                label="Radius"
                value={selectedElement.borderRadius}
                min={0}
                max={80}
                onChange={(borderRadius) =>
                  updateSelectedElement((element) =>
                    element.type === 'image'
                      ? ({ ...element, borderRadius } as PortfolioElement)
                      : element,
                  )
                }
              />
              <NumberField
                label="Crop X"
                value={selectedElement.cropX}
                min={0}
                max={100}
                onChange={(cropX) =>
                  updateSelectedElement((element) =>
                    element.type === 'image'
                      ? ({ ...element, cropX } as PortfolioElement)
                      : element,
                  )
                }
              />
              <NumberField
                label="Crop Y"
                value={selectedElement.cropY}
                min={0}
                max={100}
                onChange={(cropY) =>
                  updateSelectedElement((element) =>
                    element.type === 'image'
                      ? ({ ...element, cropY } as PortfolioElement)
                      : element,
                  )
                }
              />
            </div>
          </section>
        ) : null}

        {isShapeElement(selectedElement) || isLineElement(selectedElement) ? (
          <section className="property-section">
            <div className="property-section-heading">
              <span>Stroke and fill</span>
              <b>{selectedElement.type}</b>
            </div>
            {isShapeElement(selectedElement) ? (
              <Field label="Fill">
                <Input
                  type="color"
                  value={
                    selectedElement.fill === 'transparent'
                      ? '#f2eee3'
                      : selectedElement.fill
                  }
                  onChange={(event) =>
                    updateSelectedElement((element) =>
                      element.type === 'shape'
                        ? ({
                            ...element,
                            fill: event.target.value,
                          } as PortfolioElement)
                        : element,
                    )
                  }
                />
              </Field>
            ) : null}
            <Field label="Stroke">
              <Input
                type="color"
                value={
                  selectedElement.stroke.startsWith('#')
                    ? selectedElement.stroke
                    : '#080808'
                }
                onChange={(event) =>
                  updateSelectedElement((element) =>
                    element.type === 'shape' || element.type === 'line'
                      ? ({
                          ...element,
                          stroke: event.target.value,
                        } as PortfolioElement)
                      : element,
                  )
                }
              />
            </Field>
            <NumberField
              label="Stroke width"
              value={selectedElement.strokeWidth}
              min={0}
              max={20}
              onChange={(strokeWidth) =>
                updateSelectedElement((element) =>
                  element.type === 'shape' || element.type === 'line'
                    ? ({ ...element, strokeWidth } as PortfolioElement)
                    : element,
                )
              }
            />
          </section>
        ) : null}

        {isButtonElement(selectedElement) ? (
          <section className="property-section">
            <div className="property-section-heading">
              <span>Button</span>
              <b>Link</b>
            </div>
            <Field label="Label">
              <Input
                value={selectedElement.label}
                onChange={(event) =>
                  updateSelectedElement((element) =>
                    element.type === 'button'
                      ? ({
                          ...element,
                          label: event.target.value,
                        } as PortfolioElement)
                      : element,
                  )
                }
              />
            </Field>
            <Field label="Link URL">
              <Input
                value={selectedElement.href ?? ''}
                placeholder="https://..."
                onChange={(event) =>
                  updateSelectedElement((element) =>
                    element.type === 'button'
                      ? ({
                          ...element,
                          href: event.target.value || undefined,
                          action: event.target.value
                            ? undefined
                            : element.action,
                        } as PortfolioElement)
                      : element,
                  )
                }
              />
            </Field>
            <div className="property-grid property-grid-two">
              <Field label="Text">
                <Input
                  type="color"
                  value={selectedElement.style.color}
                  onChange={(event) =>
                    updateButtonStyle({ color: event.target.value })
                  }
                />
              </Field>
              <Field label="Border">
                <Input
                  type="color"
                  value={
                    selectedElement.style.borderColor.startsWith('#')
                      ? selectedElement.style.borderColor
                      : '#080808'
                  }
                  onChange={(event) =>
                    updateButtonStyle({ borderColor: event.target.value })
                  }
                />
              </Field>
            </div>
          </section>
        ) : null}

        <section className="property-section">
          <div className="property-section-heading">
            <span>Arrange</span>
            <b>Layout</b>
          </div>
          <div className="property-button-grid">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alignSelected('left')}
            >
              <AlignLeft aria-hidden="true" />
              Left
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alignSelected('center')}
            >
              <AlignCenter aria-hidden="true" />
              Centre
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alignSelected('right')}
            >
              <AlignRight aria-hidden="true" />
              Right
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alignSelected('top')}
            >
              <ArrowUp aria-hidden="true" />
              Top
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alignSelected('middle')}
            >
              <Move aria-hidden="true" />
              Middle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => alignSelected('bottom')}
            >
              <ArrowDown aria-hidden="true" />
              Bottom
            </Button>
          </div>
          <div className="property-button-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={bringForward}
            >
              <ArrowUp aria-hidden="true" />
              Forward
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendBackward}
            >
              <ArrowDown aria-hidden="true" />
              Back
            </Button>
          </div>
          <div className="property-button-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={duplicateSelectedElement}
            >
              <Copy aria-hidden="true" />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteSelectedElement}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </div>
        </section>
      </>
    );
  };

  const pageActions = selectedPage ? (
    <div className="page-action-row">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => duplicatePage(selectedPage)}
      >
        <Copy aria-hidden="true" />
        Duplicate
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => deletePage(selectedPage)}
      >
        <Trash2 aria-hidden="true" />
        Delete
      </Button>
    </div>
  ) : null;

  if (mode === 'preview') {
    return (
      <div className="builder-preview-shell">
        <div className="preview-mode-bar">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode('edit')}
          >
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            <Maximize2 aria-hidden="true" />
            Fullscreen
          </Button>
        </div>
        <InteractiveBook project={project} />
      </div>
    );
  }

  return (
    <div className="portfolio-builder">
      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
      />
      <input
        ref={importInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
      />

      <header className="builder-toolbar">
        <div className="builder-brand">
          <b>Studio Voigt.</b>
          <span>Book builder</span>
        </div>
        <div className="project-title-field">
          <Input
            aria-label="Project title"
            value={project.settings.title}
            onChange={(event) =>
              commitProject((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  title: event.target.value,
                },
              }))
            }
          />
        </div>
        <div className="toolbar-cluster">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2 aria-hidden="true" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2 aria-hidden="true" />
            Redo
          </Button>
          <output className="save-status" data-status={saveStatus}>
            <Save aria-hidden="true" />
            {saveStatus}
          </output>
        </div>
        <div className="toolbar-cluster">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportProject}
          >
            <Download aria-hidden="true" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            Import
          </Button>
          <Button type="button" size="sm" onClick={() => setMode('preview')}>
            <Eye aria-hidden="true" />
            Preview
          </Button>
        </div>
      </header>

      <div className="mobile-editor-message">
        <b>Desktop editing recommended</b>
        <p>
          The portfolio preview works here, but the full editing surface needs
          more room.
        </p>
        <Button type="button" size="sm" onClick={() => setMode('preview')}>
          <Eye aria-hidden="true" />
          Open preview
        </Button>
      </div>

      <div className="builder-workspace">
        <aside className="page-sidebar" aria-label="Book pages">
          <div className="panel-header">
            <span>Pages</span>
            <b>{project.pages.length}</b>
          </div>
          <div className="page-add-controls">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPage('blank')}
            >
              <Plus aria-hidden="true" />
              Blank
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPage('overview')}
            >
              <Plus aria-hidden="true" />
              Template
            </Button>
          </div>
          <div ref={pageThumbnailListRef} className="page-thumbnail-list">
            {project.pages.map((page, index) => (
              <div
                key={page.id}
                className={cn(
                  'page-thumbnail-item',
                  selectedPage?.id === page.id && 'is-selected',
                )}
                draggable
                onDragStart={() => setDraggedPageId(page.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedPageId) reorderPages(draggedPageId, page.id);
                  setDraggedPageId(null);
                }}
              >
                <button
                  type="button"
                  className="page-thumbnail-select"
                  data-selected={
                    selectedPage?.id === page.id ? 'true' : undefined
                  }
                  onClick={() => selectPage(page.id)}
                >
                  <div className="page-thumbnail-preview">
                    <PortfolioBookPage
                      page={page}
                      pageIndex={index}
                      pageTotal={project.pages.length}
                      assets={project.assets}
                      mode="thumbnail"
                      showSafeArea={false}
                    />
                  </div>
                  <div className="page-thumbnail-meta">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <b>{page.name}</b>
                  </div>
                </button>
                <div className="page-thumbnail-actions">
                  <button
                    type="button"
                    aria-label="Move page up"
                    onClick={(event) => {
                      event.stopPropagation();
                      movePage(page.id, -1);
                    }}
                  >
                    <ArrowUp aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move page down"
                    onClick={(event) => {
                      event.stopPropagation();
                      movePage(page.id, 1);
                    }}
                  >
                    <ArrowDown aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="editor-canvas-region" aria-label="Page editing canvas">
          <div className="canvas-toolbar">
            <div className="canvas-tool-group" aria-label="Add elements">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addElement('heading')}
              >
                <Type aria-hidden="true" />
                Heading
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addElement('paragraph')}
              >
                <Type aria-hidden="true" />
                Paragraph
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addElement('image')}
              >
                <ImageIcon aria-hidden="true" />
                Frame
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload aria-hidden="true" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addElement('shape')}
              >
                <Square aria-hidden="true" />
                Shape
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addElement('line')}
              >
                <Move aria-hidden="true" />
                Line
              </Button>
            </div>
            <div className="canvas-tool-group">
              <label className="editor-toggle">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => setShowGrid(event.target.checked)}
                />
                Grid
              </label>
              <label className="editor-toggle">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => setSnapToGrid(event.target.checked)}
                />
                Snap
              </label>
              <label className="editor-toggle">
                <input
                  type="checkbox"
                  checked={showSafeArea}
                  onChange={(event) => setShowSafeArea(event.target.checked)}
                />
                Safe
              </label>
              <div className="zoom-control" aria-label="Canvas zoom controls">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Zoom out"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={() => stepZoom(-ZOOM_STEP)}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <output className="zoom-value" aria-label="Zoom percentage">
                  {Math.round(zoom * 100)}%
                </output>
                <input
                  aria-label="Canvas zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(event) =>
                    setManualZoom(Number(event.target.value))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Set zoom to 100%"
                  onClick={() => setManualZoom(1)}
                >
                  100%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={zoomMode === 'fit'}
                  onClick={fitCanvasToWorkspace}
                >
                  <Maximize2 aria-hidden="true" />
                  Fit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Zoom in"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() => stepZoom(ZOOM_STEP)}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          <div ref={canvasScrollRef} className="editor-canvas-scroll">
            {selectedPage ? (
              <div className="editor-canvas-centering">
                <div
                  className="editor-canvas-shell"
                  style={{
                    width: BOOK_PAGE_WIDTH * zoom,
                    height: BOOK_PAGE_HEIGHT * zoom,
                  }}
                >
                  <div
                    className="editor-canvas-scale"
                    style={{
                      transform: `scale(${zoom})`,
                      width: BOOK_PAGE_WIDTH,
                      height: BOOK_PAGE_HEIGHT,
                    }}
                  >
                    <PortfolioBookPage
                      page={selectedPage}
                      pageIndex={Math.max(0, selectedPageIndex)}
                      pageTotal={project.pages.length}
                      assets={project.assets}
                      mode="editor"
                      selectedElementId={selectedElementId}
                      showGrid={showGrid}
                      showSafeArea={showSafeArea}
                      onSelectElement={(elementId) =>
                        setSelectedElementId(
                          elementId.length ? elementId : null,
                        )
                      }
                      onElementPointerDown={beginElementMove}
                      onResizePointerDown={beginElementResize}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>

        <aside className="properties-panel" aria-label="Properties">
          <div className="panel-header">
            <span>Properties</span>
            <b>{selectedElement ? 'Element' : 'Page'}</b>
          </div>
          <div className="properties-panel-scroll">
            {pageActions}
            {renderElementProperties()}
            <section className="property-section">
              <div className="property-section-heading">
                <span>Assets</span>
                <b>{project.assets.length}</b>
              </div>
              <div className="asset-library">
                {project.assets.length === 0 ? (
                  <p>No uploaded images yet.</p>
                ) : (
                  project.assets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => attachAssetToImage(asset)}
                      aria-label={`Use ${asset.name}`}
                    >
                      <span
                        aria-hidden="true"
                        className="asset-library-preview"
                        style={{ backgroundImage: `url("${asset.dataUrl}")` }}
                      />
                      <span>{asset.name}</span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
