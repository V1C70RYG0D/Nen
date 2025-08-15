"""
Concurrency and Race Condition Tests for Match Handling System

This test suite validates the system's ability to handle concurrent operations safely:
- Simultaneous match updates
- Optimistic locking mechanisms
- Queue processing under load
- Atomic operations
- Deadlock prevention
- Data consistency under concurrent access
"""

import pytest
import asyncio
import threading
import time
import random
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import AsyncMock, Mock, patch
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)@dataclass
class ConcurrencyTestResult:
    """Result object for concurrency test operations."""
    success: bool
    error: Optional[str] = None
    execution_time: float = 0.0
    operation_id: str = ""
    data: Optional[Dict[str, Any]] = Noneclass MockGameService:
    """Mock GameService with concurrency control mechanisms."""

    def __init__(self):
        self.matches = {}
        self.locks = {}
        self.operation_count = 0
        self.failure_count = 0
        self.concurrent_operations = 0
        self.max_concurrent_operations = 0
        self._lock = threading.RLock()
        self.optimistic_lock_enabled = True
        self.version_counter = {}

    async def create_match(self, match_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create match with optimistic locking support."""
        operation_id = str(uuid.uuid4())
        start_time = time.time()

        with self._lock:
            self.concurrent_operations += 1
            self.max_concurrent_operations = max(
                self.max_concurrent_operations,
                self.concurrent_operations
            )

        try:
            # Simulate database operation delay
            await asyncio.sleep(random.uniform(0.01, 0.05))

            match_id = match_data.get('id', str(uuid.uuid4()))

            # Check for race condition in match creation
            if match_id in self.matches:
                raise ValueError(f"Match {match_id} already exists")

            # Initialize version for optimistic locking
            version = 1
            self.version_counter[match_id] = version

            match = {
                'id': match_id,
                'status': 'pending',
                'version': version,
                'created_at': time.time(),
                'updated_at': time.time(),
                **match_data
            }

            self.matches[match_id] = match
            self.operation_count += 1

            return match

        except Exception as e:
            self.failure_count += 1
            raise e
        finally:
            with self._lock:
                self.concurrent_operations -= 1

    async def update_match(self, match_id: str, updates: Dict[str, Any],
                          expected_version: Optional[int] = None) -> Dict[str, Any]:
        """Update match with optimistic locking."""
        operation_id = str(uuid.uuid4())
        start_time = time.time()

        with self._lock:
            self.concurrent_operations += 1
            self.max_concurrent_operations = max(
                self.max_concurrent_operations,
                self.concurrent_operations
            )

        try:
            # Simulate database operation delay
            await asyncio.sleep(random.uniform(0.01, 0.05))

            if match_id not in self.matches:
                raise ValueError(f"Match {match_id} not found")

            match = self.matches[match_id]
            current_version = match.get('version', 1)

            # Optimistic locking check
            if self.optimistic_lock_enabled and expected_version is not None:
                if current_version != expected_version:
                    raise ValueError(
                        f"Version mismatch: expected {expected_version}, "
                        f"got {current_version}. Match was modified by another operation."
                    )

            # Update match data
            new_version = current_version + 1
            updated_match = {
                **match,
                **updates,
                'version': new_version,
                'updated_at': time.time()
            }

            self.matches[match_id] = updated_match
            self.version_counter[match_id] = new_version
            self.operation_count += 1

            return updated_match

        except Exception as e:
            self.failure_count += 1
            raise e
        finally:
            with self._lock:
                self.concurrent_operations -= 1

    async def make_move(self, match_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make a move with atomic operation guarantees."""
        operation_id = str(uuid.uuid4())

        with self._lock:
            self.concurrent_operations += 1
            self.max_concurrent_operations = max(
                self.max_concurrent_operations,
                self.concurrent_operations
            )

        try:
            # Simulate move validation and processing
            await asyncio.sleep(random.uniform(0.02, 0.08))

            if match_id not in self.matches:
                raise ValueError(f"Match {match_id} not found")

            match = self.matches[match_id]
            if match['status'] != 'active':
                raise ValueError(f"Match {match_id} is not active")

            # Atomic move processing
            move_id = str(uuid.uuid4())
            move = {
                'id': move_id,
                'match_id': match_id,
                'timestamp': time.time(),
                'processed': True,
                **move_data
            }

            # Update match with new move
            current_version = match.get('version', 1)
            new_version = current_version + 1

            if 'moves' not in match:
                match['moves'] = []
            match['moves'].append(move)
            match['version'] = new_version
            match['updated_at'] = time.time()

            self.matches[match_id] = match
            self.operation_count += 1

            return move

        except Exception as e:
            self.failure_count += 1
            raise e
        finally:
            with self._lock:
                self.concurrent_operations -= 1

    def get_match(self, match_id: str) -> Optional[Dict[str, Any]]:
        """Get match data (thread-safe read)."""
        with self._lock:
            return self.matches.get(match_id)

    def reset_stats(self):
        """Reset operation statistics."""
        with self._lock:
            self.operation_count = 0
            self.failure_count = 0
            self.concurrent_operations = 0
            self.max_concurrent_operations = 0class MockQueueProcessor:
    """Mock queue processor for testing queue operations under load."""

    def __init__(self, max_workers: int = 5):
        self.queue = asyncio.Queue()
        self.processed_items = []
        self.failed_items = []
        self.processing = False
        self.max_workers = max_workers
        self.worker_tasks = []
        self.stats = {
            'processed': 0,
            'failed': 0,
            'concurrent_workers': 0,
            'max_concurrent_workers': 0
        }
        self._lock = threading.RLock()

    async def add_to_queue(self, item: Dict[str, Any]):
        """Add item to processing queue."""
        await self.queue.put(item)

    async def process_item(self, item: Dict[str, Any]) -> bool:
        """Process a single queue item."""
        try:
            with self._lock:
                self.stats['concurrent_workers'] += 1
                self.stats['max_concurrent_workers'] = max(
                    self.stats['max_concurrent_workers'],
                    self.stats['concurrent_workers']
                )

            # Simulate processing time with random delays
            processing_time = random.uniform(0.01, 0.1)
            await asyncio.sleep(processing_time)

            # Simulate occasional failures
            if random.random() < 0.05:  # 5% failure rate
                raise Exception("Random processing failure")

            # Mark as processed
            processed_item = {
                **item,
                'processed_at': time.time(),
                'processing_time': processing_time
            }

            with self._lock:
                self.processed_items.append(processed_item)
                self.stats['processed'] += 1

            return True

        except Exception as e:
            with self._lock:
                self.failed_items.append({
                    **item,
                    'error': str(e),
                    'failed_at': time.time()
                })
                self.stats['failed'] += 1
            return False
        finally:
            with self._lock:
                self.stats['concurrent_workers'] -= 1

    async def worker(self):
        """Queue worker coroutine."""
        while self.processing:
            try:
                # Wait for item with timeout
                item = await asyncio.wait_for(self.queue.get(), timeout=0.5)
                await self.process_item(item)
                self.queue.task_done()
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Worker error: {e}")

    async def start_processing(self):
        """Start queue processing with multiple workers."""
        self.processing = True
        self.worker_tasks = [
            asyncio.create_task(self.worker())
            for _ in range(self.max_workers)
        ]

    async def stop_processing(self):
        """Stop queue processing."""
        self.processing = False
        for task in self.worker_tasks:
            task.cancel()
        await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        self.worker_tasks = []

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        with self._lock:
            return {
                **self.stats,
                'queue_size': self.queue.qsize(),
                'processed_items_count': len(self.processed_items),
                'failed_items_count': len(self.failed_items)
            }@pytest.fixture
def mock_game_service():
    """Provide mock game service for testing."""
    return MockGameService()@pytest.fixture
def mock_queue_processor():
    """Provide mock queue processor for testing."""
    return MockQueueProcessor()@pytest.mark.asyncio
class TestConcurrentMatchUpdates:
    """Test simultaneous match updates and race conditions."""

    async def test_concurrent_match_creation(self, mock_game_service):
        """Test concurrent match creation with race condition detection."""
        num_operations = 50
        match_id = str(uuid.uuid4())

        async def create_match_operation(operation_id: int) -> ConcurrencyTestResult:
            start_time = time.time()
            try:
                match_data = {
                    'id': match_id,  # Same ID to trigger race condition
                    'type': 'ai_vs_ai',
                    'operation_id': operation_id
                }

                result = await mock_game_service.create_match(match_data)

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id),
                    data=result
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id)
                )

        # Execute concurrent operations
        tasks = [create_match_operation(i) for i in range(num_operations)]
        results = await asyncio.gather(*tasks)

        # Analyze results
        successful_operations = [r for r in results if r.success]
        failed_operations = [r for r in results if not r.success]

        # Assertions
        assert len(successful_operations) == 1, "Only one match creation should succeed"
        assert len(failed_operations) == num_operations - 1, "All other operations should fail"

        # Verify race condition detection
        race_condition_errors = [
            r for r in failed_operations
            if "already exists" in r.error
        ]
        assert len(race_condition_errors) > 0, "Race conditions should be detected"

        # Verify service statistics
        assert mock_game_service.operation_count == 1
        assert mock_game_service.failure_count == num_operations - 1
        assert mock_game_service.max_concurrent_operations > 1

    async def test_optimistic_locking_mechanism(self, mock_game_service):
        """Test optimistic locking prevents concurrent modification conflicts."""
        # Create initial match
        match_data = {'id': str(uuid.uuid4()), 'status': 'pending'}
        match = await mock_game_service.create_match(match_data)
        match_id = match['id']
        initial_version = match['version']

        num_updates = 20

        async def update_match_operation(operation_id: int) -> ConcurrencyTestResult:
            start_time = time.time()
            try:
                # Get current match to read version
                current_match = mock_game_service.get_match(match_id)
                if not current_match:
                    raise ValueError("Match not found")

                expected_version = current_match['version']

                # Simulate concurrent update
                updates = {
                    'last_updated_by': f'operation_{operation_id}',
                    'update_count': current_match.get('update_count', 0) + 1
                }

                result = await mock_game_service.update_match(
                    match_id, updates, expected_version
                )

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id),
                    data=result
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id)
                )

        # Execute concurrent updates
        tasks = [update_match_operation(i) for i in range(num_updates)]
        results = await asyncio.gather(*tasks)

        # Analyze results
        successful_operations = [r for r in results if r.success]
        failed_operations = [r for r in results if not r.success]

        # Verify optimistic locking behavior
        assert len(successful_operations) >= 1, "At least one update should succeed"

        # Check for version mismatch errors
        version_mismatch_errors = [
            r for r in failed_operations
            if "Version mismatch" in r.error
        ]

        # In high concurrency, most operations should fail due to version conflicts
        assert len(version_mismatch_errors) > 0, "Version conflicts should occur"

        # Verify final match state
        final_match = mock_game_service.get_match(match_id)
        assert final_match['version'] > initial_version
        assert final_match['update_count'] == len(successful_operations)

    async def test_atomic_move_operations(self, mock_game_service):
        """Test atomic move operations under concurrent access."""
        # Create and start match
        match_data = {'id': str(uuid.uuid4()), 'status': 'active'}
        match = await mock_game_service.create_match(match_data)
        match_id = match['id']

        # Start the match
        await mock_game_service.update_match(match_id, {'status': 'active'})

        num_moves = 30

        async def make_move_operation(move_id: int) -> ConcurrencyTestResult:
            start_time = time.time()
            try:
                move_data = {
                    'player_id': f'player_{move_id % 2}',
                    'from': {'x': move_id % 8, 'y': 0},
                    'to': {'x': move_id % 8, 'y': 1},
                    'piece': 'pawn'
                }

                result = await mock_game_service.make_move(match_id, move_data)

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=str(move_id),
                    data=result
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=str(move_id)
                )

        # Execute concurrent moves
        tasks = [make_move_operation(i) for i in range(num_moves)]
        results = await asyncio.gather(*tasks)

        # Analyze results
        successful_moves = [r for r in results if r.success]
        failed_moves = [r for r in results if not r.success]

        # All moves should succeed (no conflicts on different positions)
        assert len(successful_moves) == num_moves, "All moves should succeed"

        # Verify match state integrity
        final_match = mock_game_service.get_match(match_id)
        assert len(final_match['moves']) == num_moves

        # Verify move ordering and atomicity
        moves = final_match['moves']
        for i, move in enumerate(moves):
            assert move['processed'] == True
            assert 'timestamp' in move
            assert move['match_id'] == match_id@pytest.mark.asyncio
class TestQueueProcessingUnderLoad:
    """Test queue processing systems under high concurrent load."""

    async def test_queue_processing_concurrent_workers(self, mock_queue_processor):
        """Test queue processing with multiple concurrent workers."""
        num_items = 100

        # Add items to queue
        for i in range(num_items):
            item = {
                'id': str(uuid.uuid4()),
                'type': 'match_update',
                'priority': random.randint(1, 5),
                'data': f'test_data_{i}'
            }
            await mock_queue_processor.add_to_queue(item)

        # Start processing
        await mock_queue_processor.start_processing()

        # Wait for processing to complete
        start_time = time.time()
        timeout = 30  # 30 seconds timeout

        while (mock_queue_processor.queue.qsize() > 0 and
               time.time() - start_time < timeout):
            await asyncio.sleep(0.1)

        # Stop processing
        await mock_queue_processor.stop_processing()

        # Analyze results
        stats = mock_queue_processor.get_stats()

        # Assertions
        assert stats['processed'] + stats['failed'] == num_items
        assert stats['processed'] > stats['failed']  # Most items should succeed
        assert stats['max_concurrent_workers'] <= mock_queue_processor.max_workers
        assert len(mock_queue_processor.processed_items) == stats['processed']
        assert len(mock_queue_processor.failed_items) == stats['failed']

        # Verify processing times are reasonable
        processing_times = [
            item['processing_time']
            for item in mock_queue_processor.processed_items
        ]
        avg_processing_time = sum(processing_times) / len(processing_times)
        assert avg_processing_time < 0.2  # Should be reasonably fast

    async def test_queue_backpressure_handling(self, mock_queue_processor):
        """Test queue system handles backpressure correctly."""
        # Set small max workers to create backpressure
        mock_queue_processor.max_workers = 2

        num_items = 50
        batch_size = 10

        # Add items in batches to simulate burst load
        for batch in range(0, num_items, batch_size):
            batch_items = []
            for i in range(batch, min(batch + batch_size, num_items)):
                item = {
                    'id': str(uuid.uuid4()),
                    'batch': batch // batch_size,
                    'index': i,
                    'data': f'batch_item_{i}'
                }
                batch_items.append(item)

            # Add batch items quickly
            for item in batch_items:
                await mock_queue_processor.add_to_queue(item)

            # Small delay between batches
            await asyncio.sleep(0.05)

        # Start processing
        await mock_queue_processor.start_processing()

        # Monitor queue size and processing
        queue_sizes = []
        start_time = time.time()
        timeout = 30

        while (mock_queue_processor.queue.qsize() > 0 and
               time.time() - start_time < timeout):
            queue_sizes.append(mock_queue_processor.queue.qsize())
            await asyncio.sleep(0.1)

        await mock_queue_processor.stop_processing()

        # Analyze backpressure handling
        stats = mock_queue_processor.get_stats()
        max_queue_size = max(queue_sizes) if queue_sizes else 0

        # Assertions
        assert stats['processed'] + stats['failed'] == num_items
        assert max_queue_size > batch_size  # Queue should build up
        assert stats['max_concurrent_workers'] == mock_queue_processor.max_workers

        # Verify gradual processing (queue size decreases over time)
        if len(queue_sizes) > 2:
            # Queue should generally decrease over time
            decreasing_trend = sum(
                1 for i in range(len(queue_sizes) - 1)
                if queue_sizes[i] >= queue_sizes[i + 1]
            )
            assert decreasing_trend > len(queue_sizes) * 0.6  # 60% decreasing trend@pytest.mark.asyncio
class TestDeadlockPrevention:
    """Test deadlock prevention mechanisms."""

    async def test_no_deadlock_in_resource_ordering(self, mock_game_service):
        """Test that resource ordering prevents deadlocks."""
        # Create multiple matches
        match_ids = []
        for i in range(5):
            match_data = {'id': str(uuid.uuid4()), 'status': 'active'}
            match = await mock_game_service.create_match(match_data)
            match_ids.append(match['id'])

        num_operations = 20
        operation_results = []

        async def cross_match_operation(operation_id: int) -> ConcurrencyTestResult:
            """Operation that accesses multiple matches in random order."""
            start_time = time.time()
            try:
                # Randomly select two different matches
                selected_matches = random.sample(match_ids, 2)

                # Access matches in consistent order to prevent deadlocks
                # (sorted by ID to ensure consistent ordering)
                sorted_matches = sorted(selected_matches)

                # Update first match
                await mock_game_service.update_match(
                    sorted_matches[0],
                    {'cross_update_op': operation_id, 'step': 1}
                )

                # Small delay to increase chance of deadlock if not prevented
                await asyncio.sleep(random.uniform(0.01, 0.03))

                # Update second match
                await mock_game_service.update_match(
                    sorted_matches[1],
                    {'cross_update_op': operation_id, 'step': 2}
                )

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id),
                    data={'matches_updated': sorted_matches}
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id)
                )

        # Execute concurrent cross-match operations
        tasks = [cross_match_operation(i) for i in range(num_operations)]

        # Use timeout to detect potential deadlocks
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks),
                timeout=10.0  # 10 second timeout
            )
        except asyncio.TimeoutError:
            pytest.fail("Operations timed out - possible deadlock detected")

        # Analyze results
        successful_operations = [r for r in results if r.success]
        failed_operations = [r for r in results if not r.success]

        # Most operations should succeed (no deadlocks)
        success_rate = len(successful_operations) / len(results)
        assert success_rate > 0.8, f"Success rate too low: {success_rate}"

        # Verify no timeout-related failures
        timeout_failures = [
            r for r in failed_operations
            if "timeout" in r.error.lower()
        ]
        assert len(timeout_failures) == 0, "No timeout failures should occur"

    async def test_timeout_based_deadlock_prevention(self, mock_game_service):
        """Test timeout-based deadlock prevention."""
        match_data = {'id': str(uuid.uuid4()), 'status': 'active'}
        match = await mock_game_service.create_match(match_data)
        match_id = match['id']

        num_long_operations = 10

        async def long_running_operation(operation_id: int) -> ConcurrencyTestResult:
            """Simulate long-running operation that might cause deadlocks."""
            start_time = time.time()
            try:
                # Long operation with multiple steps
                for step in range(3):
                    await mock_game_service.update_match(
                        match_id,
                        {
                            'long_op_id': operation_id,
                            'step': step,
                            'timestamp': time.time()
                        }
                    )

                    # Simulate processing delay
                    await asyncio.sleep(random.uniform(0.1, 0.2))

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id)
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id)
                )

        # Execute concurrent long operations with timeout
        tasks = [long_running_operation(i) for i in range(num_long_operations)]

        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks),
                timeout=15.0  # 15 second timeout
            )
        except asyncio.TimeoutError:
            pytest.fail("Long operations timed out - deadlock prevention failed")

        # Verify results
        successful_operations = [r for r in results if r.success]

        # At least some operations should complete successfully
        assert len(successful_operations) > 0, "Some operations should succeed"

        # Verify execution times are reasonable
        execution_times = [r.execution_time for r in successful_operations]
        max_execution_time = max(execution_times)
        assert max_execution_time < 10.0, "Operations should complete in reasonable time"@pytest.mark.asyncio
class TestDataConsistencyUnderConcurrency:
    """Test data consistency under concurrent access patterns."""

    async def test_consistent_match_state_updates(self, mock_game_service):
        """Test that match state remains consistent under concurrent updates."""
        # Create match with initial counters
        match_data = {
            'id': str(uuid.uuid4()),
            'status': 'active',
            'move_count': 0,
            'update_count': 0
        }
        match = await mock_game_service.create_match(match_data)
        match_id = match['id']

        num_operations = 50

        async def increment_counter_operation(operation_id: int) -> ConcurrencyTestResult:
            """Operation that increments counters in match."""
            start_time = time.time()
            try:
                # Read current state
                current_match = mock_game_service.get_match(match_id)
                if not current_match:
                    raise ValueError("Match not found")

                # Calculate new values
                new_move_count = current_match.get('move_count', 0) + 1
                new_update_count = current_match.get('update_count', 0) + 1

                # Update with optimistic locking
                updates = {
                    'move_count': new_move_count,
                    'update_count': new_update_count,
                    'last_operation': operation_id
                }

                result = await mock_game_service.update_match(
                    match_id, updates, current_match['version']
                )

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id),
                    data=result
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=str(operation_id)
                )

        # Execute concurrent counter increments
        tasks = [increment_counter_operation(i) for i in range(num_operations)]
        results = await asyncio.gather(*tasks)

        # Analyze results
        successful_operations = [r for r in results if r.success]
        failed_operations = [r for r in results if not r.success]

        # Verify final consistency
        final_match = mock_game_service.get_match(match_id)

        # Counter values should equal number of successful operations
        expected_count = len(successful_operations)
        assert final_match['move_count'] == expected_count
        assert final_match['update_count'] == expected_count

        # Version should be incremented for each successful update
        expected_version = 1 + expected_count  # Initial version + updates
        assert final_match['version'] == expected_version

        # Verify operation ordering consistency
        if len(successful_operations) > 0:
            final_operation_id = final_match.get('last_operation')
            assert final_operation_id is not None

    async def test_concurrent_read_consistency(self, mock_game_service):
        """Test read consistency during concurrent writes."""
        # Create match
        match_data = {'id': str(uuid.uuid4()), 'status': 'active', 'data': 'initial'}
        match = await mock_game_service.create_match(match_data)
        match_id = match['id']

        read_results = []
        write_results = []

        async def reader_operation(reader_id: int) -> ConcurrencyTestResult:
            """Reader operation that reads match state."""
            start_time = time.time()
            try:
                # Perform multiple reads
                reads = []
                for i in range(5):
                    current_match = mock_game_service.get_match(match_id)
                    reads.append({
                        'version': current_match.get('version'),
                        'data': current_match.get('data'),
                        'timestamp': time.time()
                    })
                    await asyncio.sleep(0.01)  # Small delay between reads

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=f'reader_{reader_id}',
                    data={'reads': reads}
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=f'reader_{reader_id}'
                )

        async def writer_operation(writer_id: int) -> ConcurrencyTestResult:
            """Writer operation that updates match state."""
            start_time = time.time()
            try:
                current_match = mock_game_service.get_match(match_id)
                updates = {
                    'data': f'updated_by_writer_{writer_id}',
                    'writer_id': writer_id
                }

                result = await mock_game_service.update_match(
                    match_id, updates, current_match['version']
                )

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - start_time,
                    operation_id=f'writer_{writer_id}',
                    data=result
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - start_time,
                    operation_id=f'writer_{writer_id}'
                )

        # Create mixed read/write operations
        num_readers = 10
        num_writers = 5

        reader_tasks = [reader_operation(i) for i in range(num_readers)]
        writer_tasks = [writer_operation(i) for i in range(num_writers)]

        # Execute concurrently
        all_tasks = reader_tasks + writer_tasks
        results = await asyncio.gather(*all_tasks)

        # Separate results
        read_results = [r for r in results if r.operation_id.startswith('reader_')]
        write_results = [r for r in results if r.operation_id.startswith('writer_')]

        # Verify read consistency
        successful_reads = [r for r in read_results if r.success]
        successful_writes = [r for r in write_results if r.success]

        assert len(successful_reads) > 0, "Some reads should succeed"
        assert len(successful_writes) > 0, "Some writes should succeed"

        # Verify that reads show consistent state (no partial updates)
        for read_result in successful_reads:
            reads = read_result.data['reads']
            for read in reads:
                # Each read should have consistent version and data
                assert read['version'] is not None
                assert read['data'] is not None

                # Version should be monotonically increasing or same
                # (no partial/inconsistent states)
                if len(reads) > 1:
                    versions = [r['version'] for r in reads]
                    assert all(v >= versions[0] for v in versions), \
                        "Versions should be monotonically increasing"@pytest.mark.asyncio
class TestPerformanceUnderConcurrency:
    """Test system performance characteristics under concurrent load."""

    async def test_throughput_under_concurrent_load(self, mock_game_service):
        """Test system throughput under high concurrent load."""
        num_matches = 10
        operations_per_match = 20

        # Create multiple matches
        match_ids = []
        for i in range(num_matches):
            match_data = {'id': str(uuid.uuid4()), 'status': 'active'}
            match = await mock_game_service.create_match(match_data)
            match_ids.append(match['id'])

        start_time = time.time()

        async def high_frequency_operation(operation_id: int) -> ConcurrencyTestResult:
            """High-frequency operation on random match."""
            op_start_time = time.time()
            try:
                match_id = random.choice(match_ids)
                updates = {
                    'high_freq_op': operation_id,
                    'timestamp': time.time()
                }

                current_match = mock_game_service.get_match(match_id)
                result = await mock_game_service.update_match(
                    match_id, updates, current_match['version']
                )

                return ConcurrencyTestResult(
                    success=True,
                    execution_time=time.time() - op_start_time,
                    operation_id=str(operation_id),
                    data={'match_id': match_id}
                )
            except Exception as e:
                return ConcurrencyTestResult(
                    success=False,
                    error=str(e),
                    execution_time=time.time() - op_start_time,
                    operation_id=str(operation_id)
                )

        # Execute high-frequency operations
        total_operations = num_matches * operations_per_match
        tasks = [high_frequency_operation(i) for i in range(total_operations)]
        results = await asyncio.gather(*tasks)

        total_time = time.time() - start_time

        # Analyze performance
        successful_operations = [r for r in results if r.success]
        failed_operations = [r for r in results if not r.success]

        # Calculate metrics
        success_rate = len(successful_operations) / len(results)
        throughput = len(successful_operations) / total_time  # ops/second

        avg_latency = sum(r.execution_time for r in successful_operations) / len(successful_operations)
        max_latency = max(r.execution_time for r in successful_operations)

        # Performance assertions
        assert success_rate > 0.7, f"Success rate too low: {success_rate}"
        assert throughput > 10, f"Throughput too low: {throughput} ops/sec"
        assert avg_latency < 0.1, f"Average latency too high: {avg_latency}s"
        assert max_latency < 0.5, f"Max latency too high: {max_latency}s"

        # Verify concurrent execution
        assert mock_game_service.max_concurrent_operations > 1, \
            "Operations should execute concurrently"

        logger.info(f"Performance Test Results:")
        logger.info(f"  Total Operations: {total_operations}")
        logger.info(f"  Success Rate: {success_rate:.2%}")
        logger.info(f"  Throughput: {throughput:.1f} ops/sec")
        logger.info(f"  Avg Latency: {avg_latency:.3f}s")
        logger.info(f"  Max Latency: {max_latency:.3f}s")
        logger.info(f"  Max Concurrent Ops: {mock_game_service.max_concurrent_operations}")if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
