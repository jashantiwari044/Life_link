"""add donation camp status

The status column was added to the DonationCamp model without a migration, so
any database built from alembic was missing it and every camps query failed
with "no such column: donation_camps.status".

Revision ID: d2b8e5f14a77
Revises: c1a7d4e92f30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd2b8e5f14a77'
down_revision: Union[str, None] = 'c1a7d4e92f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('donation_camps', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('status', sa.String(), nullable=False, server_default='ACTIVE')
        )


def downgrade() -> None:
    with op.batch_alter_table('donation_camps', schema=None) as batch_op:
        batch_op.drop_column('status')
