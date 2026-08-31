"""blood_request_lifecycle_overhaul

Revision ID: b4f8e913ce5c
Revises: 0cbc8e1f2486
Create Date: 2026-08-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4f8e913ce5c'
down_revision: Union[str, None] = '0cbc8e1f2486'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'blood_inventory',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('blood_bank_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('blood_group', sa.String(), nullable=False),
        sa.Column('units_available', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('blood_bank_id', 'blood_group', name='uq_bloodbank_group'),
    )

    with op.batch_alter_table('blood_requests', schema=None) as batch_op:
        batch_op.alter_column('status', server_default='PENDING')

    # Remap dev-DB rows still holding statuses retired by this migration so
    # existing data lines up with the new lifecycle literals.
    op.execute("UPDATE blood_requests SET status = 'PENDING' WHERE status = 'DRAFT'")
    op.execute("UPDATE blood_requests SET status = 'READY_FOR_DISPATCH' WHERE status IN ('ASSIGNED', 'FULFILLED')")


def downgrade() -> None:
    with op.batch_alter_table('blood_requests', schema=None) as batch_op:
        batch_op.alter_column('status', server_default='DRAFT')

    op.drop_table('blood_inventory')
