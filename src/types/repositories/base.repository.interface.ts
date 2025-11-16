/**
 * Base Repository Interface
 * All repositories should extend this interface
 */

import { PaginationParams, PaginatedResponse } from '../models/base.types'

export interface IBaseRepository<T, CreateDto, UpdateDto> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>

  /**
   * Find all entities with pagination
   */
  findAll(params: PaginationParams): Promise<PaginatedResponse<T>>

  /**
   * Create a new entity
   */
  create(data: CreateDto): Promise<T>

  /**
   * Update an entity
   */
  update(id: string, data: UpdateDto): Promise<T>

  /**
   * Delete an entity
   */
  delete(id: string): Promise<void>

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>

  /**
   * Count total entities
   */
  count(where?: any): Promise<number>
}
