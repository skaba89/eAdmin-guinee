"""
OCR Service - eAdministration Suite Guinea.
Document text extraction and indexing for search.
Currently provides a stub implementation that can be replaced
with Tesseract, Google Vision, or AWS Textract.
"""

import hashlib
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Result of OCR processing."""
    text: str
    confidence: float  # 0-100
    language: str
    page_count: int
    processing_time_ms: int
    engine: str


class OCRService:
    """
    OCR service for extracting text from documents.

    In production, this should be replaced with:
    - Tesseract OCR (open source, self-hosted)
    - Google Cloud Vision API
    - AWS Textract
    - Azure Form Recognizer

    For now, returns metadata-based extraction as a placeholder.
    """

    SUPPORTED_FORMATS = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpeg',
        'image/png': 'png',
        'image/tiff': 'tiff',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    }

    def __init__(self):
        self.engine = "stub"

    async def extract_text(
        self,
        file_path: str,
        file_type: str,
        language: str = "fra"
    ) -> OCRResult:
        """
        Extract text from a document file.

        Args:
            file_path: Path to the file in MinIO/S3
            file_type: MIME type of the file
            language: Language code (fra=French, en=English)

        Returns:
            OCRResult with extracted text and metadata
        """
        import time
        start = time.time()

        if file_type not in self.SUPPORTED_FORMATS:
            return OCRResult(
                text="",
                confidence=0,
                language=language,
                page_count=0,
                processing_time_ms=0,
                engine=self.engine,
            )

        # Stub: In production, integrate real OCR engine here
        # Example with Tesseract:
        # import pytesseract
        # from PIL import Image
        # text = pytesseract.image_to_string(Image.open(file_path), lang=language)

        stub_text = (
            f"[OCR Stub] Document: {file_path}\n"
            f"Type: {file_type}\n"
            f"Language: {language}\n"
            f"Note: Connect a real OCR engine (Tesseract, Google Vision, etc.) for production use."
        )

        processing_time = int((time.time() - start) * 1000)

        return OCRResult(
            text=stub_text,
            confidence=50,  # Low confidence for stub
            language=language,
            page_count=1,
            processing_time_ms=processing_time,
            engine=self.engine,
        )

    async def compute_file_hash(self, file_content: bytes) -> str:
        """Compute SHA-256 hash of file content for integrity verification."""
        return hashlib.sha256(file_content).hexdigest()

    def is_format_supported(self, file_type: str) -> bool:
        """Check if a file type is supported for OCR."""
        return file_type in self.SUPPORTED_FORMATS


# Singleton
ocr_service = OCRService()
