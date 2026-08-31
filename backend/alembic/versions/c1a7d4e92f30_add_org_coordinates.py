"""add organization coordinates

Revision ID: c1a7d4e92f30
Revises: b4f8e913ce5c
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c1a7d4e92f30'
down_revision: Union[str, None] = 'b4f8e913ce5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('latitude', sa.Numeric(10, 8), nullable=True))
        batch_op.add_column(sa.Column('longitude', sa.Numeric(11, 8), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.drop_column('longitude')
        batch_op.drop_column('latitude')
